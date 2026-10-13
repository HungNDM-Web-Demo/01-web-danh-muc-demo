'use client'

import { Loader2, Star } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { demoErrors, isPublicDemo } from '../lib/demo-rules'
import type { DemoDevStatus } from '../types/demo.types'

type DemoLike = {
  id: string
  name: string
  devStatus: DemoDevStatus
  isVisible: boolean
  isFeatured: boolean
}

/** Chú thích khi ngôi sao bị vô hiệu (UC-08 E2) */
export const FEATURED_DISABLED_HINT = 'Chỉ demo đang công khai mới được nổi bật'

/**
 * Công tắc Hiển thị (FR-22): Mới tạo thì vô hiệu, chú thích "Chuyển sang Đang làm trở lên trước" (UC-07 E2).
 * Người không có quyền demos.publish chỉ thấy nhãn.
 */
export function VisibilitySwitch({
  demo,
  canPublish,
  pending,
  onChange,
}: {
  demo: DemoLike
  canPublish: boolean
  pending?: boolean
  onChange: (next: boolean) => void
}) {
  const listed = demo.isVisible && demo.devStatus !== 'MoiTao'
  if (!canPublish) {
    return listed ? (
      <StatusBadge tone={demo.devStatus === 'DangLam' ? 'neutral' : 'success'}>
        {demo.devStatus === 'DangLam' ? 'Sắp ra mắt' : 'Hiển thị'}
      </StatusBadge>
    ) : (
      <StatusBadge tone="neutral" dot={false}>
        Ẩn
      </StatusBadge>
    )
  }

  const blocked = demo.devStatus === 'MoiTao'
  const control = (
    <span className="inline-flex min-h-11 items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={demo.isVisible}
        disabled={blocked || pending}
        onCheckedChange={onChange}
        aria-label={`Hiển thị ${demo.name} trên danh mục`}
        aria-describedby={blocked ? `vis-hint-${demo.id}` : undefined}
      />
      {pending && (
        <Loader2 className="text-muted-foreground size-3.5 animate-spin" aria-hidden="true" />
      )}
      {blocked && (
        <span id={`vis-hint-${demo.id}`} className="sr-only">
          {demoErrors.newCannotShow}
        </span>
      )}
    </span>
  )

  if (!blocked) return control
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-3"
        >
          {control}
        </span>
      </TooltipTrigger>
      <TooltipContent>{demoErrors.newCannotShow}</TooltipContent>
    </Tooltip>
  )
}

/** Nút sao nổi bật (FR-23, BR-04): demo không công khai thì vô hiệu kèm chú thích. */
export function FeaturedButton({
  demo,
  canPublish,
  pending,
  onToggle,
}: {
  demo: DemoLike
  canPublish: boolean
  pending?: boolean
  onToggle: (next: boolean) => void
}) {
  const allowed = isPublicDemo(demo)
  const icon = pending ? (
    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
  ) : (
    <Star className={cn('size-[1.125rem]', demo.isFeatured && 'fill-current')} aria-hidden="true" />
  )

  if (!canPublish) {
    return demo.isFeatured ? (
      <span
        className="text-warning inline-flex size-11 items-center justify-center"
        title="Nổi bật"
      >
        <Star className="size-[1.125rem] fill-current" aria-hidden="true" />
        <span className="sr-only">Nổi bật</span>
      </span>
    ) : (
      <span
        className="text-muted-foreground/50 inline-flex size-11 items-center justify-center"
        aria-label="Không nổi bật"
      >
        <Star className="size-[1.125rem]" aria-hidden="true" />
      </span>
    )
  }

  const disabled = (!allowed && !demo.isFeatured) || pending
  const button = (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={demo.isFeatured}
      aria-label={demo.isFeatured ? `Bỏ nổi bật ${demo.name}` : `Đánh dấu nổi bật ${demo.name}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle(!demo.isFeatured)
      }}
      className={cn(
        'focus-visible:ring-ring/50 inline-flex size-11 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed',
        demo.isFeatured
          ? 'text-warning hover:bg-warning/10'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-40'
      )}
    >
      {icon}
    </button>
  )
  if (allowed || demo.isFeatured) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="focus-visible:ring-ring/50 inline-flex rounded-lg outline-none focus-visible:ring-3"
          aria-label={FEATURED_DISABLED_HINT}
          onClick={(e) => e.stopPropagation()}
        >
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{FEATURED_DISABLED_HINT}</TooltipContent>
    </Tooltip>
  )
}
