'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { readJson, storageKey, writeJson } from '@/lib/storage'
import type { RecordVisitRequest } from '../types/catalog.types'
import { useRecordVisit } from './use-catalog'

const VISITOR_KEY = storageKey('visitor-id')

/** BR-14: mã ngẫu nhiên lưu trên trình duyệt, không chứa thông tin cá nhân (32 ký tự hex) */
function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null
  const saved = readJson<string>('local', VISITOR_KEY)
  if (saved && saved.length >= 16 && saved.length <= 64) return saved
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  // Trình duyệt chặn bộ nhớ thì vẫn ghi lượt với mã tạm của lần mở trang này
  writeJson('local', VISITOR_KEY, id)
  return id
}

function detectDevice(): RecordVisitRequest['device'] {
  if (typeof window === 'undefined') return 'Desktop'
  const mobileUa = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent)
  return mobileUa || window.matchMedia('(max-width: 767px)').matches ? 'Mobile' : 'Desktop'
}

/**
 * Ghi lượt xem trang chi tiết và lượt bấm "Xem demo" (FR-27, BR-14).
 * Người đang đăng nhập không được tính (BE cũng bỏ qua khi có header Authorization).
 */
export function useVisitTracker() {
  const record = useRecordVisit()
  const { mutate } = record

  const track = useCallback(
    (slug: string, type: RecordVisitRequest['type']) => {
      const state = useAuthStore.getState()
      if (!state.hydrated || state.session) return
      const visitorId = getVisitorId()
      if (!visitorId) return
      mutate({
        slug,
        request: {
          type,
          visitorId,
          device: detectDevice(),
          referrer: document.referrer ? document.referrer.slice(0, 300) : null,
        },
      })
    },
    [mutate]
  )

  return {
    trackView: useCallback((slug: string) => track(slug, 'View'), [track]),
    trackOpen: useCallback((slug: string) => track(slug, 'Open'), [track]),
  }
}
