'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Loader2, Pencil, Plus, Save, Tags, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { IndustryFormDialog } from '../components/IndustryFormDialog'
import { IndustryIcon } from '../components/IndustryIcon'
import { industryClass, industryVars } from '../components/industry-style'
import { useDeleteIndustry, useIndustries, useReorderIndustries } from '../hooks/use-industries'
import type { Industry } from '../types/industry.types'

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

/**
 * SCR-07 Nhóm ngành (UC-09, FR-25, FR-26, BR-13): danh sách kèm biểu tượng, màu, số demo; thêm, sửa,
 * kéo thả sắp xếp (hàng nút lọc trên danh mục đi theo thứ tự này), xóa nhóm không còn demo.
 */
export function IndustriesPage() {
  const { can } = usePermissions()
  const canCreate = can(permissions.industries.create)
  const canUpdate = can(permissions.industries.update)
  const canDelete = can(permissions.industries.delete)

  const industries = useIndustries()
  const reorder = useReorderIndustries()
  const remove = useDeleteIndustry()

  const [order, setOrder] = useState<string[] | null>(null)
  const [form, setForm] = useState<{ open: boolean; industry: Industry | null }>({
    open: false,
    industry: null,
  })
  const [deleteTarget, setDeleteTarget] = useState<Industry | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const rows = useMemo(() => {
    const list = industries.data ?? []
    if (!order) return list
    const byId = new Map(list.map((i) => [i.id, i]))
    return order.map((id) => byId.get(id)).filter((i): i is Industry => !!i)
  }, [industries.data, order])

  const orderChanged = !!order && order.join() !== (industries.data ?? []).map((i) => i.id).join()
  const nextCode = (industries.data ?? []).reduce((acc, i) => Math.max(acc, i.code), 0) + 1

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = rows.map((r) => r.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from >= 0 && to >= 0) setOrder(arrayMove(ids, from, to))
  }

  const saveOrder = () => {
    if (!order) return
    reorder.mutate(order, {
      onSuccess: () => {
        toast.success('Đã lưu thứ tự nhóm ngành', {
          description: 'Hàng nút lọc trên danh mục đi theo thứ tự mới.',
        })
        setOrder(null)
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      toast.success(`Đã xóa nhóm ${deleteTarget.name}`)
    } catch (error) {
      // Bị từ chối (nhóm còn demo) thì thử lại cũng không được: báo lỗi và đóng hộp thoại
      toast.error(getErrorMessage(error))
    }
  }

  const nameOf = (id: string | number) => rows.find((r) => r.id === String(id))?.name ?? ''

  return (
    <PermissionGuard permission={permissions.industries.view} redirect>
      <div className="space-y-6">
        <PageHeader
          title="Nhóm ngành"
          icon={Tags}
          description="Phân loại demo theo ngành của khách. Thứ tự ở đây là thứ tự hàng nút lọc trên trang danh mục."
          actions={
            canCreate ? (
              <Button onClick={() => setForm({ open: true, industry: null })}>
                <Plus aria-hidden="true" />
                Thêm nhóm
              </Button>
            ) : null
          }
        />

        {canUpdate && orderChanged && (
          <div className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">
              Thứ tự đã thay đổi, bấm Lưu thứ tự để áp dụng lên danh mục.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOrder(null)} disabled={reorder.isPending}>
                <X aria-hidden="true" />
                Hủy
              </Button>
              <Button onClick={saveOrder} disabled={reorder.isPending}>
                {reorder.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                Lưu thứ tự
              </Button>
            </div>
          </div>
        )}

        {industries.error ? (
          <div className="bg-card rounded-xl border">
            <ErrorState error={industries.error} onRetry={() => industries.refetch()} />
          </div>
        ) : industries.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-card rounded-xl border">
            <EmptyState icon={Tags} title="Chưa có nhóm ngành" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[verticalOnly]}
            onDragEnd={handleDragEnd}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  'Nhấn Space để nhấc nhóm, mũi tên lên xuống để di chuyển, Space để thả, Esc để hủy.',
              },
              announcements: {
                onDragStart: ({ active }) => `Đã nhấc ${nameOf(active.id)}.`,
                onDragOver: ({ active, over }) =>
                  over
                    ? `${nameOf(active.id)} ở vị trí ${rows.findIndex((r) => r.id === over.id) + 1}.`
                    : undefined,
                onDragEnd: ({ active }) => `Đã thả ${nameOf(active.id)}.`,
                onDragCancel: ({ active }) => `Đã hủy kéo ${nameOf(active.id)}.`,
              },
            }}
          >
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ul
                className="bg-card divide-y overflow-hidden rounded-xl border shadow-xs"
                aria-label="Danh sách nhóm ngành"
              >
                {rows.map((industry, index) => (
                  <IndustryRow
                    key={industry.id}
                    industry={industry}
                    index={index}
                    canSort={canUpdate}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={() => setForm({ open: true, industry })}
                    onDelete={() => setDeleteTarget(industry)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <p className="text-muted-foreground text-sm">
          Nút nhóm chỉ hiện trên{' '}
          <a
            href={routePath.catalog}
            target="_blank"
            rel="noopener"
            className="text-primary underline-offset-4 hover:underline"
          >
            trang danh mục
          </a>{' '}
          khi nhóm có ít nhất 1 demo hiển thị; số trên nút đếm cả demo Sắp ra mắt.
        </p>
      </div>

      <IndustryFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        industry={form.industry}
        nextCode={nextCode}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        variant="destructive"
        icon={Trash2}
        title={`Xóa nhóm ${deleteTarget?.name ?? ''}?`}
        description="Chỉ xóa được nhóm không còn demo nào. Không hoàn tác được."
        confirmText="Xóa nhóm"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </PermissionGuard>
  )
}

function IndustryRow({
  industry,
  index,
  canSort,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  industry: Industry
  index: number
  canSort: boolean
  canUpdate: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: industry.id, disabled: !canSort })
  return (
    <li
      ref={setNodeRef}
      style={{
        ...industryVars(industry.color),
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
      className={cn(
        'bg-card flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-4',
        isDragging && 'relative z-10 shadow-lg'
      )}
    >
      {canSort && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Kéo để đổi thứ tự ${industry.name}`}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg outline-none focus-visible:ring-3 active:cursor-grabbing"
        >
          <GripVertical className="size-5" aria-hidden="true" />
        </button>
      )}
      <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-sm tabular-nums">
        {index + 1}
      </span>
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          industryClass.soft,
          industryClass.text
        )}
      >
        <IndustryIcon iconName={industry.icon} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{industry.name}</span>
          <span className="text-muted-foreground font-mono text-xs">?nganh={industry.slug}</span>
        </p>
        <p className="text-muted-foreground truncate text-sm">
          {industry.description || 'Chưa có mô tả'}
        </p>
      </div>
      <span
        className="flex shrink-0 items-center gap-2 text-sm"
        title={`Mã ${industry.code} · màu ${industry.color}`}
      >
        <span className={cn('size-4 rounded-full border', industryClass.dot)} aria-hidden="true" />
        <span className="text-muted-foreground font-mono text-xs uppercase">{industry.color}</span>
      </span>
      <span className="w-36 shrink-0 text-sm">
        <span className="font-semibold tabular-nums">{industry.demoCount}</span> demo
        <span className="text-muted-foreground"> · {industry.visibleDemoCount} hiển thị</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {canUpdate && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            aria-label={`Sửa nhóm ${industry.name}`}
          >
            <Pencil />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label={`Xóa nhóm ${industry.name}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
          </Button>
        )}
      </span>
    </li>
  )
}
