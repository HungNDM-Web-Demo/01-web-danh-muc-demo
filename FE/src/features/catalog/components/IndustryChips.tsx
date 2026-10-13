'use client'

import { useEffect, useRef } from 'react'
import { LayoutGrid } from 'lucide-react'
import { IndustryIcon } from '@/features/industries/components/IndustryIcon'
import { industryClass, industryVars } from '@/features/industries/components/industry-style'
import { cn } from '@/lib/utils'
import type { PublicIndustry } from '../types/catalog.types'

type IndustryChipsProps = {
  industries: PublicIndustry[]
  /** Tổng số demo hiển thị (nút "Tất cả") */
  total: number
  /** slug đang chọn; null là "Tất cả" */
  selected: string | null
  onSelect: (slug: string | null) => void
}

const chipBase =
  'inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10'

/**
 * Hàng nút lọc nhóm ngành (FR-02, BR-13): mỗi nút kèm số demo; nút đang chọn nền màu nhóm, chữ trắng.
 * Trên điện thoại cuộn ngang, không xuống dòng (08-THIET-KE-GIAO-DIEN §3).
 */
export function IndustryChips({ industries, total, selected, onSelect }: IndustryChipsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Đưa nút đang chọn vào tầm nhìn (cuộn ngang trong hàng) khi mở link có sẵn ?nganh= trên điện thoại
  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!list || !active || list.scrollWidth <= list.clientWidth) return
    const left = active.offsetLeft - 16
    list.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [selected])

  return (
    <div
      ref={listRef}
      role="group"
      aria-label="Lọc theo nhóm ngành"
      className="relative -mx-4 flex snap-x scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
        className={cn(
          chipBase,
          selected === null
            ? 'bg-foreground text-background border-transparent'
            : 'bg-card text-foreground hover:bg-muted border-border'
        )}
      >
        <LayoutGrid className="size-4" aria-hidden="true" />
        Tất cả
        <Count active={selected === null}>{total}</Count>
      </button>
      {industries.map((industry) => {
        const active = selected === industry.slug
        return (
          <button
            key={industry.slug}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? null : industry.slug)}
            style={industryVars(industry.color)}
            className={cn(
              chipBase,
              active
                ? cn(industryClass.solid, 'border-transparent')
                : 'bg-card text-foreground hover:bg-muted border-border'
            )}
          >
            <IndustryIcon
              iconName={industry.icon}
              className={cn('size-4', !active && industryClass.text)}
            />
            {industry.name}
            <Count active={active}>{industry.count}</Count>
          </button>
        )
      })}
    </div>
  )
}

function Count({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums',
        active ? 'bg-white/20' : 'bg-muted text-muted-foreground'
      )}
    >
      {children}
    </span>
  )
}
