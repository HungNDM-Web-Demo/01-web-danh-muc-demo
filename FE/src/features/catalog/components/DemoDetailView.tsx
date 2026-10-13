'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Clock,
  ExternalLink,
  EyeOff,
  Layers,
  MonitorSmartphone,
  Phone,
  Star,
  Target,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { routePath } from '@/config/route-path'
import { DevStatusBadge } from '@/features/demos/components/DevStatusBadge'
import type { DemoDetail } from '@/features/demos/types/demo.types'
import { IndustryBadge } from '@/features/industries/components/IndustryBadge'
import { cn } from '@/lib/utils'
import { usePublicBrand } from '../hooks/use-public-brand'
import type { PublicDemoDetail } from '../types/catalog.types'
import { DemoAccounts } from './DemoAccounts'
import { DemoCard } from './DemoCard'
import { InternalPanel } from './InternalPanel'
import { ScreenshotGallery } from './ScreenshotGallery'
import { ShareDialog } from './ShareDialog'

type DemoDetailViewProps = {
  demo: PublicDemoDetail
  /** FR-13: demo khách không thấy, chỉ người có quyền nội bộ xem trước */
  preview?: boolean
  /** Có quyền demos.view-internal: dữ liệu khung nội bộ; null là không có quyền */
  internal: { detail: DemoDetail | undefined; isLoading: boolean } | null
  canShare: boolean
  canEdit: boolean
  /** Bấm "Xem demo" (ghi lượt mở demo) */
  onOpenDemo: () => void
  onOpenRelated?: (slug: string) => void
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card rounded-2xl border p-5 shadow-xs">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
      </h2>
      <div className="text-foreground/90 mt-3 text-[0.9375rem] leading-relaxed text-pretty">
        {children}
      </div>
    </div>
  )
}

/**
 * Nội dung trang chi tiết demo (SCR-02, FR-06 → FR-09, FR-12 → FR-14):
 * desktop 2 cột 7/5, điện thoại 1 cột và nút "Xem demo" dính đáy màn hình (08-THIET-KE-GIAO-DIEN §4).
 */
export function DemoDetailView({
  demo,
  preview,
  internal,
  canShare,
  canEdit,
  onOpenDemo,
  onOpenRelated,
}: DemoDetailViewProps) {
  const brand = usePublicBrand()
  const canOpen = !demo.isComingSoon && !!demo.demoUrl && demo.devStatus !== 'MoiTao'
  const showShare = canShare && canOpen
  const industryHref = `${routePath.catalog}?nganh=${encodeURIComponent(demo.industry.slug)}`

  const openButton = (className?: string) => (
    <Button
      asChild
      variant="cta"
      size="lg"
      className={cn('h-12 rounded-xl px-6 text-base', className)}
    >
      <a
        href={demo.demoUrl!}
        target="_blank"
        rel="noopener"
        aria-label={`Xem demo ${demo.name} (mở tab mới)`}
        onClick={onOpenDemo}
      >
        Xem demo
        <ExternalLink aria-hidden="true" />
      </a>
    </Button>
  )

  return (
    <div>
      {preview && (
        <div
          role="note"
          className="border-warning/40 sticky top-16 z-30 border-y bg-[color-mix(in_srgb,var(--warning)_14%,var(--background))]"
        >
          <p className="text-foreground mx-auto flex w-full max-w-[1440px] items-center gap-2 px-4 py-2.5 text-sm font-medium sm:px-6 lg:px-8">
            <EyeOff className="text-warning size-4 shrink-0" aria-hidden="true" />
            Xem trước, khách không thấy trang này
          </p>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Vị trí trang"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 pb-5 text-sm sm:pt-6"
        >
          <Link
            href={routePath.catalog}
            className="text-muted-foreground hover:text-foreground -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-medium transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Danh mục
          </Link>
          <span className="text-muted-foreground" aria-hidden="true">
            /
          </span>
          <Link
            href={industryHref}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center rounded-lg transition-colors"
          >
            {demo.industry.name}
          </Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-7">
            <ScreenshotGallery
              name={demo.name}
              screenshots={demo.screenshots}
              industry={demo.industry}
            />
          </div>

          <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:col-span-5 lg:self-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <IndustryBadge
                  name={demo.industry.name}
                  color={demo.industry.color}
                  icon={demo.industry.icon}
                  size="md"
                />
                <DevStatusBadge status={demo.devStatus} audience="public" className="h-7" />
                {demo.isFeatured && (
                  <span className="bg-warning/12 text-warning ring-warning/25 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset">
                    <Star className="size-3.5 fill-current" aria-hidden="true" />
                    Nổi bật
                  </span>
                )}
              </div>
              <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                {demo.name}
              </h1>
              {demo.shortDescription && (
                <p className="text-muted-foreground text-base text-pretty sm:text-lg">
                  {demo.shortDescription}
                </p>
              )}
            </div>

            {canOpen ? (
              <div className="hidden flex-wrap gap-3 lg:flex">
                {openButton()}
                {showShare && (
                  <ShareDialog
                    demo={demo}
                    canIncludePassword={!!internal}
                    password={internal?.detail?.internal?.demoPassword}
                    passwordLoading={internal?.isLoading}
                    className="h-12 rounded-xl px-5"
                  />
                )}
              </div>
            ) : (
              <div className="bg-muted/60 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center">
                <p className="flex flex-1 items-start gap-2 text-sm font-medium">
                  <Clock
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Demo đang hoàn thiện, gọi hotline để được giới thiệu trực tiếp
                </p>
                {brand.hotlineHref && (
                  <Button asChild variant="cta" className="hidden h-11 rounded-xl lg:inline-flex">
                    <a href={brand.hotlineHref}>
                      <Phone aria-hidden="true" />
                      {brand.hotlineDisplay}
                    </a>
                  </Button>
                )}
              </div>
            )}

            {showShare && (
              <ShareDialog
                demo={demo}
                canIncludePassword={!!internal}
                password={internal?.detail?.internal?.demoPassword}
                passwordLoading={internal?.isLoading}
                className="h-11 w-full rounded-xl lg:hidden"
              />
            )}

            {canOpen && (
              <DemoAccounts requiresLogin={demo.requiresLogin} accounts={demo.accounts} />
            )}
          </aside>
        </div>

        {/* Dành cho · Vấn đề giải quyết · Tính năng nổi bật · Mô tả chi tiết · Loại sản phẩm · Thiết bị (FR-06) */}
        <div className="mt-10 space-y-6 sm:mt-14">
          {(demo.targetCustomers || demo.problemSolved) && (
            <div className="grid gap-4 md:grid-cols-2">
              {demo.targetCustomers && (
                <InfoCard icon={Users} title="Dành cho">
                  {demo.targetCustomers}
                </InfoCard>
              )}
              {demo.problemSolved && (
                <InfoCard icon={Target} title="Vấn đề giải quyết">
                  {demo.problemSolved}
                </InfoCard>
              )}
            </div>
          )}

          {demo.features.length > 0 && (
            <section
              aria-labelledby="features-title"
              className="bg-card rounded-2xl border p-5 shadow-xs sm:p-6"
            >
              <h2 id="features-title" className="text-lg font-semibold">
                Tính năng nổi bật
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {demo.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[0.9375rem]">
                    <CircleCheck
                      className="text-success mt-0.5 size-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-pretty">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            aria-labelledby="about-title"
            className="bg-card rounded-2xl border p-5 shadow-xs sm:p-6"
          >
            <h2 id="about-title" className="text-lg font-semibold">
              Giới thiệu chi tiết
            </h2>
            {demo.description && (
              <p className="text-foreground/90 mt-3 max-w-4xl text-[0.9375rem] leading-relaxed text-pretty whitespace-pre-line">
                {demo.description}
              </p>
            )}
            <dl className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Layers
                  className="text-muted-foreground mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-muted-foreground text-sm">Loại sản phẩm</dt>
                  <dd className="font-medium">{demo.productType || '—'}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MonitorSmartphone
                  className="text-muted-foreground mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-muted-foreground text-sm">Thiết bị sử dụng</dt>
                  <dd className="font-medium">{demo.devices || '—'}</dd>
                </div>
              </div>
            </dl>
          </section>

          {internal && (
            <InternalPanel
              detail={internal.detail}
              isLoading={internal.isLoading}
              canEdit={canEdit}
            />
          )}
        </div>

        {demo.related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-14 sm:mt-20">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 id="related-title" className="text-2xl font-bold tracking-tight">
                Demo cùng ngành {demo.industry.name}
              </h2>
              <Link
                href={industryHref}
                className="text-primary inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              >
                Xem tất cả
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {demo.related.map((item) => (
                <li key={item.slug}>
                  <DemoCard demo={item} headingLevel="h3" onOpenDemo={onOpenRelated} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Điện thoại: nút Xem demo dính đáy màn hình */}
      <div className="bg-background/90 supports-[backdrop-filter]:bg-background/75 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        {canOpen ? (
          openButton('w-full')
        ) : brand.hotlineHref ? (
          <Button asChild variant="cta" size="lg" className="h-12 w-full rounded-xl text-base">
            <a href={brand.hotlineHref}>
              <Phone aria-hidden="true" />
              Gọi tư vấn {brand.hotlineDisplay}
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
