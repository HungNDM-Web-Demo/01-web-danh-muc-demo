'use client'

import { DemoCoverArt } from '@/features/catalog/components/DemoCoverArt'
import { DemoImage } from '@/features/catalog/components/DemoImage'
import { cn } from '@/lib/utils'

type DemoThumbProps = {
  name: string
  coverUrl?: string | null
  color: string
  className?: string
}

/** Ảnh nhỏ 64×40 trong bảng quản trị (08-THIET-KE-GIAO-DIEN §5); chưa có ảnh dùng ảnh mặc định màu nhóm. */
export function DemoThumb({ name, coverUrl, color, className }: DemoThumbProps) {
  return (
    <span
      className={cn(
        'bg-muted relative block h-10 w-16 shrink-0 overflow-hidden rounded-md border',
        className
      )}
    >
      <DemoImage
        src={coverUrl}
        alt=""
        sizes="64px"
        fallback={<DemoCoverArt name={name} color={color} hideName />}
      />
    </span>
  )
}
