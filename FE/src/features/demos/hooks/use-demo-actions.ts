'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage, getMissing } from '@/lib/api-error'
import type { MissingState } from '../components/MissingConditionsDialog'
import { useSetDemoFeatured, useSetDemoVisibility } from './use-demos'

/**
 * Bật/tắt hiển thị (FR-22, BR-01, BR-02) và nổi bật (FR-23, BR-04) dùng chung cho bảng và trang sửa.
 * Lỗi thiếu điều kiện mở hộp thoại liệt kê từng mục; lỗi khác hiện toast đúng thông báo của API.
 */
export function useDemoPublishActions() {
  const setVisibility = useSetDemoVisibility()
  const setFeatured = useSetDemoFeatured()
  const [missing, setMissing] = useState<MissingState>(null)
  const [pending, setPending] = useState<{ id: string; kind: 'visibility' | 'featured' } | null>(
    null
  )

  const handleError = (error: unknown) => {
    const list = getMissing(error)
    if (list.length) setMissing({ title: getErrorMessage(error), missing: list })
    else toast.error(getErrorMessage(error))
  }

  const toggleVisibility = (demo: { id: string; name: string }, isVisible: boolean) => {
    setPending({ id: demo.id, kind: 'visibility' })
    setVisibility.mutate(
      { id: demo.id, isVisible },
      {
        onSuccess: (detail) =>
          toast.success(
            isVisible ? `Đã bật hiển thị ${demo.name}` : `Đã tắt hiển thị ${demo.name}`,
            {
              description: isVisible
                ? detail.devStatus === 'DangLam'
                  ? 'Demo xuất hiện trên danh mục dạng "Sắp ra mắt".'
                  : 'Demo xuất hiện trên danh mục với nút "Xem demo".'
                : 'Demo không còn trên danh mục; link chi tiết hiện "Không tìm thấy demo".',
            }
          ),
        onError: handleError,
        onSettled: () => setPending(null),
      }
    )
  }

  const toggleFeatured = (demo: { id: string; name: string }, isFeatured: boolean) => {
    setPending({ id: demo.id, kind: 'featured' })
    setFeatured.mutate(
      { id: demo.id, isFeatured },
      {
        onSuccess: () =>
          toast.success(
            isFeatured ? `Đã đánh dấu nổi bật ${demo.name}` : `Đã bỏ nổi bật ${demo.name}`
          ),
        onError: handleError,
        onSettled: () => setPending(null),
      }
    )
  }

  return {
    toggleVisibility,
    toggleFeatured,
    missing,
    closeMissing: () => setMissing(null),
    showMissing: setMissing,
    isPending: (id: string, kind: 'visibility' | 'featured') =>
      pending?.id === id && pending.kind === kind,
  }
}
