'use client'

import Link from 'next/link'
import { ArrowRight, Clock, ExternalLink, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { routeTo } from '@/config/route-path'
import { DevStatusBadge } from '@/features/demos/components/DevStatusBadge'
import { IndustryBadge } from '@/features/industries/components/IndustryBadge'
import { cn } from '@/lib/utils'
import type { PublicDemoCard } from '../types/catalog.types'
import { DemoCoverArt } from './DemoCoverArt'
import { DemoImage } from './DemoImage'

/** Lưới 1/2/3/4 cột (NFR-01): kích thước ảnh tương ứng cho next/image */
export const CARD_IMAGE_SIZES =
  '(min-width: 1440px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'

type DemoCardProps = {
  demo: PublicDemoCard
  /** Thẻ trong màn hình đầu: tải ảnh ngay (LCP) */
  eager?: boolean
  /** Bấm "Xem demo" (ghi lượt mở demo, FR-27) */
  onOpenDemo?: (slug: string) => void
  /** Thẻ hiện ở trang chi tiết (demo cùng ngành): tiêu đề cấp 3 */
  headingLevel?: 'h2' | 'h3'
}

/**
 * Thẻ demo (FR-01, 08-THIET-KE-GIAO-DIEN §3): ảnh 16:10, nhãn Nổi bật, nhãn nhóm, nhãn trạng thái,
 * tên và mô tả ngắn tối đa 2 dòng, nút "Xem demo" mở tab mới. Cả thẻ bấm được để vào Chi tiết
 * (liên kết phủ toàn thẻ), trừ vùng nút "Xem demo".
 */
export function DemoCard({ demo, eager, onOpenDemo, headingLevel = 'h2' }: DemoCardProps) {
  const Heading = headingLevel
  const detailHref = routeTo.demoDetail(demo.slug)
  const canOpen = !demo.isComingSoon && !!demo.demoUrl

  return (
    <article
      className={cn(
        'group bg-card text-card-foreground relative flex h-full flex-col overflow-hidden rounded-2xl border',
        'shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_16px_-8px_rgb(15_23_42/0.08)] transition-[transform,box-shadow,border-color] duration-200',
        'hover:border-primary/25 hover:shadow-[0_2px_4px_rgb(15_23_42/0.05),0_16px_32px_-12px_rgb(15_23_42/0.22)] motion-safe:hover:-translate-y-0.5',
        'focus-within:ring-ring/50 focus-within:ring-3'
      )}
    >
      <div className="bg-muted relative aspect-[16/10] overflow-hidden border-b">
        <DemoImage
          src={demo.coverUrl}
          alt={`${demo.name}: ảnh màn hình chính`}
          sizes={CARD_IMAGE_SIZES}
          eager={eager}
          imageClassName="motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
          fallback={
            <DemoCoverArt name={demo.name} color={demo.industry.color} icon={demo.industry.icon} />
          }
        />
        {demo.isComingSoon && (
          <div className="bg-background/45 absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-background/95 text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm">
              <Clock className="text-muted-foreground size-4" aria-hidden="true" />
              Sắp ra mắt
            </span>
          </div>
        )}
        {demo.isFeatured && (
          <span className="bg-background/95 text-foreground absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm">
            <Star className="text-warning size-3.5 fill-current" aria-hidden="true" />
            Nổi bật
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <IndustryBadge name={demo.industry.name} color={demo.industry.color} />
          <DevStatusBadge status={demo.devStatus} audience="public" />
        </div>
        <div className="space-y-1.5">
          <Heading className="text-lg leading-snug font-semibold tracking-tight">
            <Link
              href={detailHref}
              className="line-clamp-2 outline-none after:absolute after:inset-0 after:z-0 after:content-['']"
            >
              {demo.name}
            </Link>
          </Heading>
          {demo.shortDescription && (
            <p className="text-muted-foreground line-clamp-2 text-sm text-pretty">
              {demo.shortDescription}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center gap-3 pt-1">
          {canOpen ? (
            <Button
              asChild
              variant="cta"
              className="relative z-10 h-10 rounded-xl px-4 max-sm:h-11"
            >
              <a
                href={demo.demoUrl!}
                target="_blank"
                rel="noopener"
                aria-label={`Xem demo ${demo.name} (mở tab mới)`}
                onClick={() => onOpenDemo?.(demo.slug)}
              >
                Xem demo
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <span className="text-muted-foreground text-sm">Đang hoàn thiện</span>
          )}
          <span
            aria-hidden="true"
            className="text-primary ml-auto inline-flex items-center gap-1 text-sm font-medium transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
          >
            Chi tiết
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  )
}

/** Khung xương đúng kích thước thẻ để không nhảy bố cục khi tải */
export function DemoCardSkeleton() {
  return (
    <div
      className="bg-card flex h-full flex-col overflow-hidden rounded-2xl border"
      aria-hidden="true"
    >
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}
