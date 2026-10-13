'use client'

import {
  CircleCheck,
  CircleDashed,
  CirclePlay,
  Construction,
  Eye,
  LayoutGrid,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DemoDevStatus, DemoSummary } from '../types/demo.types'

type CardDef = {
  key: string
  label: string
  icon: LucideIcon
  tone: string
  value: (s: DemoSummary) => React.ReactNode
  status?: DemoDevStatus
}

const CARDS: CardDef[] = [
  {
    key: 'total',
    label: 'Tổng',
    icon: LayoutGrid,
    tone: 'bg-primary/10 text-primary',
    value: (s) => s.total,
  },
  {
    key: 'hoanThien',
    label: 'Hoàn thiện',
    icon: CircleCheck,
    tone: 'bg-success/12 text-success',
    value: (s) => s.hoanThien,
    status: 'HoanThien',
  },
  {
    key: 'demoDuoc',
    label: 'Demo được',
    icon: CirclePlay,
    tone: 'bg-primary/10 text-primary',
    value: (s) => s.demoDuoc,
    status: 'DemoDuoc',
  },
  {
    key: 'dangLam',
    label: 'Đang làm',
    icon: Construction,
    tone: 'bg-warning/12 text-warning',
    value: (s) => s.dangLam,
    status: 'DangLam',
  },
  {
    key: 'moiTao',
    label: 'Mới tạo',
    icon: CircleDashed,
    tone: 'bg-muted text-muted-foreground',
    value: (s) => s.moiTao,
    status: 'MoiTao',
  },
  {
    key: 'visible',
    label: 'Đang hiển thị',
    icon: Eye,
    tone: 'bg-info/10 text-info',
    value: (s) => s.visible,
  },
  {
    key: 'featured',
    label: 'Nổi bật',
    icon: Star,
    tone: 'bg-warning/12 text-warning',
    value: (s) => (
      <>
        {s.featured}
        <span className="text-muted-foreground text-base font-medium">/{s.featuredMax}</span>
      </>
    ),
  },
]

type DemoSummaryCardsProps = {
  summary: DemoSummary | undefined
  isLoading: boolean
  /** Trạng thái đang lọc (thẻ trạng thái bấm được để lọc nhanh) */
  activeStatus?: DemoDevStatus
  onStatusClick?: (status: DemoDevStatus) => void
}

/**
 * 7 thẻ tổng hợp đầu trang Quản lý demo (FR-16, 02-SRS §6): Tổng, 4 trạng thái phát triển,
 * Đang hiển thị (gồm Sắp ra mắt), Nổi bật x/6. Thẻ trạng thái bấm để lọc bảng.
 */
export function DemoSummaryCards({
  summary,
  isLoading,
  activeStatus,
  onStatusClick,
}: DemoSummaryCardsProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7" aria-label="Tổng hợp demo">
      {CARDS.map((card) => {
        const clickable = !!card.status && !!onStatusClick
        const active = !!card.status && card.status === activeStatus
        const content = (
          <>
            <span className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-sm font-medium">{card.label}</span>
              <span className={cn('flex size-8 items-center justify-center rounded-lg', card.tone)}>
                <card.icon className="size-4" aria-hidden="true" />
              </span>
            </span>
            {isLoading || !summary ? (
              <Skeleton className="mt-2 h-8 w-12" />
            ) : (
              <span className="mt-1 block text-2xl font-semibold tracking-tight tabular-nums">
                {card.value(summary)}
              </span>
            )}
          </>
        )
        return (
          <li key={card.key}>
            {clickable ? (
              <button
                type="button"
                onClick={() => onStatusClick?.(card.status!)}
                aria-pressed={active}
                className={cn(
                  'bg-card focus-visible:ring-ring/50 block h-full w-full rounded-xl border p-4 text-left shadow-xs transition-colors outline-none focus-visible:ring-3',
                  active ? 'border-primary ring-primary/20 ring-2' : 'hover:border-primary/30'
                )}
              >
                {content}
              </button>
            ) : (
              <div className="bg-card h-full rounded-xl border p-4 shadow-xs">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
