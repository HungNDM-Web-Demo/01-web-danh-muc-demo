'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDownUp, LayoutGrid, Loader2, Plus, Save, SearchX, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { useIndustries } from '@/features/industries/hooks/use-industries'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { matchesSearch } from '@/lib/normalize'
import { DemoSummaryCards } from '../components/DemoSummaryCards'
import { DemosTable } from '../components/DemosTable'
import { MissingConditionsDialog } from '../components/MissingConditionsDialog'
import { useDemoPublishActions } from '../hooks/use-demo-actions'
import { useDemoSummary, useDemos, useReorderDemos } from '../hooks/use-demos'
import { demoErrors, demoLimits } from '../lib/demo-rules'
import { devStatusLabels, devStatusOrder, type DemoDevStatus } from '../types/demo.types'

const ALL = 'all'
type VisibilityFilter = 'all' | 'visible' | 'hidden'

/**
 * SCR-05 Quản lý demo (UC-03, UC-05, UC-07, UC-08): thẻ tổng hợp, lọc nhóm ngành/trạng thái/hiển thị,
 * tìm theo tên hoặc mã dự án, bảng, chế độ sắp xếp kéo thả (chỉ khi không lọc, BR-18).
 * Người thiếu quyền demos.update không có nút Thêm, Sửa (UC-03 E2).
 */
export function DemosPage() {
  const { can } = usePermissions()
  const canCreate = can(permissions.demos.create)
  const canUpdate = can(permissions.demos.update)
  const canPublish = can(permissions.demos.publish)

  const demos = useDemos()
  const summary = useDemoSummary()
  const industries = useIndustries({ enabled: can(permissions.industries.view) })
  const reorder = useReorderDemos()
  const actions = useDemoPublishActions()

  const [industryId, setIndustryId] = useState<string>(ALL)
  const [status, setStatus] = useState<DemoDevStatus | typeof ALL>(ALL)
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [search, setSearch] = useState('')
  const [searchKey, setSearchKey] = useState(0)
  const [sortMode, setSortMode] = useState(false)
  const [order, setOrder] = useState<string[] | null>(null)

  const hasFilters = industryId !== ALL || status !== ALL || visibility !== 'all' || !!search.trim()

  const filtered = useMemo(
    () =>
      (demos.data ?? []).filter(
        (d) =>
          (industryId === ALL || d.industry.id === industryId) &&
          (status === ALL || d.devStatus === status) &&
          (visibility === 'all' || (visibility === 'visible' ? d.isVisible : !d.isVisible)) &&
          (matchesSearch(d.name, search) ||
            matchesSearch(d.projectCode, search) ||
            matchesSearch(d.folder, search))
      ),
    [demos.data, industryId, status, visibility, search]
  )

  // Chế độ sắp xếp: toàn bộ danh sách theo thứ tự tạm (chưa lưu)
  const rows = useMemo(() => {
    if (!sortMode || !order) return filtered
    const byId = new Map((demos.data ?? []).map((d) => [d.id, d]))
    return order.map((id) => byId.get(id)).filter((d): d is NonNullable<typeof d> => !!d)
  }, [sortMode, order, filtered, demos.data])

  const orderChanged = !!order && order.join() !== (demos.data ?? []).map((d) => d.id).join()
  const featuredCount = (demos.data ?? []).filter((d) => d.isFeatured).length

  const clearFilters = () => {
    setIndustryId(ALL)
    setStatus(ALL)
    setVisibility('all')
    setSearch('')
    setSearchKey((k) => k + 1)
  }

  const startSort = () => {
    setOrder((demos.data ?? []).map((d) => d.id))
    setSortMode(true)
  }

  const cancelSort = () => {
    setSortMode(false)
    setOrder(null)
  }

  const saveOrder = () => {
    if (!order) return
    reorder.mutate(order, {
      onSuccess: () => {
        toast.success('Đã lưu thứ tự', {
          description: 'Thứ tự được đánh lại 10, 20, 30… theo vị trí mới.',
        })
        cancelSort()
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  const sortButton = (
    <Button variant="outline" onClick={startSort} disabled={hasFilters || !demos.data?.length}>
      <ArrowDownUp aria-hidden="true" />
      Sắp xếp
    </Button>
  )

  return (
    <PermissionGuard permission={permissions.demos.view} redirect>
      <div className="space-y-6">
        <PageHeader
          title="Quản lý demo"
          icon={LayoutGrid}
          description="Tình trạng mọi demo trong kho: trạng thái phát triển, hiển thị trên danh mục, nổi bật, thứ tự."
          actions={
            canCreate && !sortMode ? (
              <Button asChild>
                <Link href={routePath.adminDemoNew}>
                  <Plus aria-hidden="true" />
                  Thêm demo
                </Link>
              </Button>
            ) : null
          }
        />

        <DemoSummaryCards
          summary={summary.data}
          isLoading={summary.isPending}
          activeStatus={status === ALL ? undefined : status}
          onStatusClick={sortMode ? undefined : (s) => setStatus((cur) => (cur === s ? ALL : s))}
        />

        {sortMode ? (
          <div
            role="region"
            aria-label="Chế độ sắp xếp"
            className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-0.5">
              <p className="font-medium">Chế độ sắp xếp</p>
              <p className="text-muted-foreground text-sm">
                Kéo tay nắm ở đầu dòng để đổi vị trí; bấm ngôi sao để đánh dấu nổi bật. Lưu thì thứ
                tự được đánh lại 10, 20, 30…
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-card inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium tabular-nums">
                <Star className="text-warning size-4 fill-current" aria-hidden="true" />
                Nổi bật {featuredCount}/{demoLimits.featuredMax}
              </span>
              <Button variant="outline" onClick={cancelSort} disabled={reorder.isPending}>
                <X aria-hidden="true" />
                Hủy
              </Button>
              <Button onClick={saveOrder} disabled={!orderChanged || reorder.isPending}>
                {reorder.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                Lưu thứ tự
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <SearchInput
                key={searchKey}
                onSearch={setSearch}
                placeholder="Tìm tên hoặc mã dự án…"
                aria-label="Tìm theo tên demo hoặc mã dự án"
                delay={250}
              />
              <Select value={industryId} onValueChange={setIndustryId}>
                <SelectTrigger className="w-full sm:w-44" aria-label="Lọc nhóm ngành">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Mọi nhóm ngành</SelectItem>
                  {industries.data?.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as DemoDevStatus | typeof ALL)}
              >
                <SelectTrigger className="w-full sm:w-40" aria-label="Lọc trạng thái">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
                  {devStatusOrder.map((s) => (
                    <SelectItem key={s} value={s}>
                      {devStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as VisibilityFilter)}
              >
                <SelectTrigger className="w-full sm:w-40" aria-label="Lọc hiển thị">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hiển thị: tất cả</SelectItem>
                  <SelectItem value="visible">Đang hiển thị</SelectItem>
                  <SelectItem value="hidden">Đang ẩn</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  <X aria-hidden="true" />
                  Xóa lọc
                </Button>
              )}
            </div>
            {canPublish && (
              <div className="flex items-center gap-3">
                {hasFilters && (
                  <span className="text-muted-foreground text-xs" id="sort-hint">
                    {demoErrors.sortNeedsNoFilter}
                  </span>
                )}
                {hasFilters ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        aria-describedby="sort-hint"
                        className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-3"
                      >
                        {sortButton}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{demoErrors.sortNeedsNoFilter}</TooltipContent>
                  </Tooltip>
                ) : (
                  sortButton
                )}
              </div>
            )}
          </div>
        )}

        {demos.error ? (
          <div className="bg-card rounded-xl border">
            <ErrorState error={demos.error} onRetry={() => demos.refetch()} />
          </div>
        ) : (
          <DemosTable
            rows={rows}
            isLoading={demos.isPending}
            sortMode={sortMode}
            onReorder={setOrder}
            canPublish={canPublish}
            canUpdate={canUpdate}
            isPending={actions.isPending}
            onToggleVisibility={(demo, next) => actions.toggleVisibility(demo, next)}
            onToggleFeatured={(demo, next) => actions.toggleFeatured(demo, next)}
            emptyState={
              <EmptyState
                icon={SearchX}
                title="Không có demo phù hợp"
                description="Thử bỏ bớt bộ lọc hoặc tìm theo mã dự án."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Xóa lọc
                  </Button>
                }
              />
            }
          />
        )}
        {!sortMode && demos.data && (
          <p className="text-muted-foreground text-sm">
            Hiển thị {filtered.length}/{demos.data.length} demo.{' '}
            {canUpdate ? 'Bấm một dòng để sửa.' : 'Bấm một dòng để mở trang chi tiết.'}
          </p>
        )}
      </div>
      <MissingConditionsDialog state={actions.missing} onClose={actions.closeMissing} />
    </PermissionGuard>
  )
}
