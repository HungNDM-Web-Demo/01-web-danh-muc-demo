'use client'

import { useParams } from 'next/navigation'
import { DemoDetailPage } from '@/features/catalog/pages/DemoDetailPage'

/**
 * Máy chủ không thấy demo công khai (mã 404): HTML có sẵn "Không tìm thấy demo" (FR-11, TC-14).
 * Trình duyệt vẫn đọc lại: người có quyền nội bộ được xem trước (FR-13); chế độ mock đọc mock-db
 * (demo vừa công khai trong phiên demo, slug cũ).
 */
export default function DemoNotFoundPage() {
  const params = useParams<{ slug: string }>()
  const slug = decodeURIComponent(params?.slug ?? '')
  return <DemoDetailPage slug={slug} initialLookup={{}} />
}
