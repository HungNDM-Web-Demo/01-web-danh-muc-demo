'use client'

import { createContext, useContext, useMemo } from 'react'
import { usePublicSettings } from '@/features/settings/hooks/use-settings'
import type { PublicSettings } from '@/features/settings/types/setting.types'
import { toPublicBrand, type PublicBrand } from '../lib/contact'

/** Cài đặt công khai máy chủ đã render sẵn, dùng tới khi trình duyệt tải xong (không chớp, không lệch hydrate). */
export const ServerSettingsContext = createContext<PublicSettings>({})

/**
 * Tên, logo, hotline, Zalo của công ty (FR-05). Render phía máy chủ dùng cài đặt máy chủ truyền xuống;
 * trình duyệt đọc lại cài đặt (mock-db hoặc API) để thấy thay đổi trong phiên demo.
 */
export function usePublicBrand(): PublicBrand {
  const serverSettings = useContext(ServerSettingsContext)
  const { data } = usePublicSettings()
  return useMemo(() => toPublicBrand(data ?? serverSettings), [data, serverSettings])
}
