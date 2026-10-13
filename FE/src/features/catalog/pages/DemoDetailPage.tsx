'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { appConfig } from '@/config/app.config'
import { permissions } from '@/config/permissions'
import { routeTo } from '@/config/route-path'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useDemoBySlug } from '@/features/demos/hooks/use-demos'
import type { DemoDetail } from '@/features/demos/types/demo.types'
import { useIndustries } from '@/features/industries/hooks/use-industries'
import type { Industry } from '@/features/industries/types/industry.types'
import { usePermissions } from '@/hooks/use-permissions'
import { DemoDetailView } from '../components/DemoDetailView'
import { DemoNotFound } from '../components/DemoNotFound'
import { usePublicDemo } from '../hooks/use-catalog'
import { useVisitTracker } from '../hooks/use-visit-tracker'
import type { PublicDemoDetail, PublicDemoLookup } from '../types/catalog.types'

type DemoDetailPageProps = {
  slug: string
  /** Dữ liệu máy chủ đã render sẵn; `{}` là máy chủ không tìm thấy demo công khai */
  initialLookup?: PublicDemoLookup
}

/** Dựng dữ liệu trang chi tiết từ DTO quản trị để xem trước demo chưa công khai (FR-13). */
function toPreview(detail: DemoDetail, industry: Industry | undefined): PublicDemoDetail {
  const screenshots = [...detail.screenshots].sort((a, b) => a.sortOrder - b.sortOrder)
  const cover = screenshots.find((s) => s.isCover) ?? screenshots[0]
  return {
    slug: detail.slug,
    name: detail.name,
    industry: {
      slug: industry?.slug ?? '',
      name: industry?.name ?? 'Chưa phân nhóm',
      color: industry?.color ?? '#475569',
      icon: industry?.icon ?? null,
    },
    shortDescription: detail.shortDescription,
    coverUrl: cover?.url ?? null,
    devStatus: detail.devStatus,
    isComingSoon: detail.devStatus === 'DangLam' || detail.devStatus === 'MoiTao',
    demoUrl: detail.demoUrl,
    isFeatured: detail.isFeatured,
    sortOrder: detail.sortOrder,
    features: detail.features,
    keywords: detail.keywords,
    targetCustomers: detail.targetCustomers,
    problemSolved: detail.problemSolved,
    description: detail.description,
    productType: detail.productType,
    devices: detail.devices,
    requiresLogin: detail.requiresLogin,
    accounts: detail.requiresLogin ? detail.accounts : [],
    screenshots: screenshots.map((s) => ({
      url: s.url,
      caption: s.caption,
      width: s.width,
      height: s.height,
      isCover: s.id === cover?.id,
    })),
    related: [],
    updatedAt: detail.updatedAt,
  }
}

function DetailSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Đang tải demo"
    >
      <Skeleton className="mb-5 h-6 w-40" />
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-3 lg:col-span-7">
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="aspect-[16/10] rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-4 lg:col-span-5">
          <Skeleton className="h-7 w-48 rounded-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-40 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

/**
 * SCR-02 Chi tiết demo (UC-02, UC-03, UC-04). Máy chủ render sẵn phần công khai; trình duyệt đọc lại
 * qua service (mock-db hoặc API), chuyển hướng slug cũ ở chế độ mock (BR-06), tải khung nội bộ bằng API
 * có token khi có quyền (FR-12) và xem trước demo chưa công khai (FR-13). Ghi lượt xem, lượt mở (FR-27).
 */
export function DemoDetailPage({ slug, initialLookup }: DemoDetailPageProps) {
  const router = useRouter()
  const { hydrated } = useAuth()
  const { can } = usePermissions()
  const canInternal = hydrated && can(permissions.demos.viewInternal)
  const canShare = hydrated && can(permissions.demos.share)
  const canEdit = hydrated && can(permissions.demos.update)
  const { trackView, trackOpen } = useVisitTracker()

  const publicQuery = usePublicDemo(slug, initialLookup)
  const lookup = publicQuery.data
  const publicDemo = lookup?.demo ?? null
  const redirectSlug = lookup?.redirectSlug ?? null
  const publicMissing = (!!lookup && !publicDemo && !redirectSlug) || publicQuery.isError

  const internalQuery = useDemoBySlug(slug, canInternal)
  const industriesQuery = useIndustries({
    enabled: canInternal && publicMissing && hydrated && can(permissions.industries.view),
  })

  // BR-06: slug cũ chuyển sang slug mới (chế độ api máy chủ đã trả 301; chế độ mock đọc mock-db)
  const internalSlug = internalQuery.data?.slug
  useEffect(() => {
    if (redirectSlug) router.replace(routeTo.demoDetail(redirectSlug))
    else if (publicMissing && internalSlug && internalSlug !== slug)
      router.replace(routeTo.demoDetail(internalSlug))
  }, [redirectSlug, publicMissing, internalSlug, slug, router])

  // FR-27: ghi 1 lượt xem mỗi lần mở trang (BR-14 chống trùng ở API); người đăng nhập không tính
  const viewedSlug = useRef<string | null>(null)
  useEffect(() => {
    if (!hydrated || !publicDemo || viewedSlug.current === publicDemo.slug) return
    viewedSlug.current = publicDemo.slug
    trackView(publicDemo.slug)
  }, [hydrated, publicDemo, trackView])

  const preview = useMemo(() => {
    if (!publicMissing || !internalQuery.data) return null
    const industry = industriesQuery.data?.find((i) => i.id === internalQuery.data.industryId)
    return toPreview(internalQuery.data, industry)
  }, [publicMissing, internalQuery.data, industriesQuery.data])

  const internal = canInternal
    ? { detail: internalQuery.data, isLoading: internalQuery.isPending }
    : null

  // Máy chủ không thấy demo thì metadata là "Không tìm thấy demo"; khi trình duyệt tìm ra (xem trước demo
  // chưa công khai, hoặc demo vừa bật hiển thị ở chế độ mock) thì đặt lại tiêu đề tab theo mẫu của layout.
  const shownName = publicDemo?.name ?? preview?.name
  useEffect(() => {
    if (!publicMissing || !shownName) return
    document.title = `${shownName} · ${appConfig.name}`
  }, [publicMissing, shownName])

  if (redirectSlug) return <DetailSkeleton />

  if (publicDemo) {
    return (
      <DemoDetailView
        demo={publicDemo}
        internal={internal}
        canShare={canShare}
        canEdit={canEdit}
        onOpenDemo={() => trackOpen(publicDemo.slug)}
        onOpenRelated={trackOpen}
      />
    )
  }

  if (publicMissing) {
    if (preview) {
      return (
        <DemoDetailView
          demo={preview}
          preview
          internal={internal}
          canShare={canShare}
          canEdit={canEdit}
          onOpenDemo={() => undefined}
        />
      )
    }
    if (canInternal && internalQuery.isPending) return <DetailSkeleton />
    return <DemoNotFound />
  }

  return <DetailSkeleton />
}
