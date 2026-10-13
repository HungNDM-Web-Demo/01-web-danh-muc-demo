'use client'

import { CircleCheck, CircleX, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { demoErrors, visibilityConditions } from '../../lib/demo-rules'
import type { DemoDetail } from '../../types/demo.types'

type VisibilityPanelProps = {
  demo: DemoDetail | null
  canPublish: boolean
  pending: boolean
  /** Form còn thay đổi chưa lưu: điều kiện tính theo bản đã lưu */
  dirty: boolean
  onToggle: (next: boolean) => void
}

/**
 * Công tắc Hiển thị kèm danh sách điều kiện BR-01, BR-02 (check xanh / x đỏ) ở đầu trang sửa demo (FR-22).
 * Demo Mới tạo: công tắc vô hiệu, chú thích "Chuyển sang Đang làm trở lên trước" (UC-07 E2, TC-35).
 */
export function VisibilityPanel({
  demo,
  canPublish,
  pending,
  dirty,
  onToggle,
}: VisibilityPanelProps) {
  const conditions = demo
    ? visibilityConditions({
        devStatus: demo.devStatus,
        shortDescription: demo.shortDescription,
        features: demo.features,
        screenshotCount: demo.screenshots.length,
        demoUrl: demo.demoUrl,
        requiresLogin: demo.requiresLogin,
        accountCount: demo.accounts.length,
      })
    : []
  const isNew = !demo || demo.devStatus === 'MoiTao'
  const disabled = !demo || !canPublish || isNew || pending

  return (
    <section aria-labelledby="visibility-title" className="bg-card rounded-xl border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 id="visibility-title" className="text-sm font-semibold">
            Hiển thị trên danh mục
          </h2>
          <p id="visibility-hint" className="text-muted-foreground text-xs">
            {!demo
              ? 'Lưu demo trước, sau đó chuyển trạng thái rồi bật hiển thị.'
              : isNew
                ? demoErrors.newCannotShow
                : demo.isVisible
                  ? demo.devStatus === 'DangLam'
                    ? 'Khách thấy thẻ "Sắp ra mắt", chưa mở được demo.'
                    : 'Khách đang thấy demo này trên danh mục.'
                  : 'Đang ẩn, khách không thấy demo này.'}
          </p>
        </div>
        <span className="inline-flex min-h-11 items-center gap-2">
          {pending && (
            <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden="true" />
          )}
          <Switch
            checked={!!demo?.isVisible}
            disabled={disabled}
            onCheckedChange={onToggle}
            aria-label="Hiển thị trên danh mục"
            aria-describedby="visibility-hint"
          />
        </span>
      </div>
      {demo && (
        <ul
          className="mt-3 grid gap-1.5 border-t pt-3 sm:grid-cols-2"
          aria-label="Điều kiện hiển thị"
        >
          {conditions.map((c) => (
            <li
              key={c.key}
              className={cn(
                'flex items-start gap-2 text-xs',
                c.ok ? 'text-foreground' : 'text-destructive'
              )}
            >
              {c.ok ? (
                <CircleCheck className="text-success mt-px size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <CircleX className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>
                <span className="sr-only">{c.ok ? 'Đạt: ' : 'Còn thiếu: '}</span>
                {c.label}
              </span>
            </li>
          ))}
        </ul>
      )}
      {demo && dirty && (
        <p className="text-muted-foreground mt-2 text-xs">
          Điều kiện tính theo bản đã lưu, lưu thay đổi để cập nhật.
        </p>
      )}
    </section>
  )
}
