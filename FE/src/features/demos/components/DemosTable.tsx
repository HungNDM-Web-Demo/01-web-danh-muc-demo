'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { Eye, GripVertical, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { routeTo } from '@/config/route-path'
import { IndustryBadge } from '@/features/industries/components/IndustryBadge'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DemoListItem } from '../types/demo.types'
import { DemoThumb } from './DemoThumb'
import { DevStatusBadge } from './DevStatusBadge'
import { FeaturedButton, VisibilitySwitch } from './PublishControls'

type DemosTableProps = {
  rows: DemoListItem[]
  isLoading: boolean
  /** Chế độ sắp xếp: tay nắm kéo ở đầu dòng (FR-23, BR-18) */
  sortMode: boolean
  onReorder: (ids: string[]) => void
  canPublish: boolean
  canUpdate: boolean
  isPending: (id: string, kind: 'visibility' | 'featured') => boolean
  onToggleVisibility: (demo: DemoListItem, next: boolean) => void
  onToggleFeatured: (demo: DemoListItem, next: boolean) => void
  emptyState: React.ReactNode
}

/** Chỉ kéo theo chiều dọc */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

const HEAD = 'text-muted-foreground h-11 px-3 text-xs font-semibold tracking-wide uppercase'

/**
 * Bảng Quản lý demo (FR-16): thứ tự, ảnh nhỏ 64×40, tên + thư mục, nhóm ngành, trạng thái, công tắc hiển thị,
 * nút sao nổi bật, người phụ trách, cập nhật. Bấm dòng: người có quyền sửa mở trang sửa, người chỉ xem mở
 * trang chi tiết công khai cùng tab (08-THIET-KE-GIAO-DIEN §5).
 */
export function DemosTable(props: DemosTableProps) {
  const { rows, isLoading, sortMode, onReorder, emptyState } = props
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const ids = useMemo(() => rows.map((r) => r.id), [rows])

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }

  const nameOf = (id: string | number) => rows.find((r) => r.id === String(id))?.name ?? ''

  const table = (
    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <div className="overflow-x-auto">
        <Table className="min-w-[1080px]">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              {sortMode && (
                <TableHead className={cn(HEAD, 'w-12')}>
                  <span className="sr-only">Kéo để sắp xếp</span>
                </TableHead>
              )}
              <TableHead className={cn(HEAD, 'w-16 text-right')}>Thứ tự</TableHead>
              <TableHead className={cn(HEAD, 'w-20')}>Ảnh</TableHead>
              <TableHead className={HEAD}>Tên demo</TableHead>
              <TableHead className={HEAD}>Nhóm ngành</TableHead>
              <TableHead className={HEAD}>Trạng thái</TableHead>
              <TableHead className={HEAD}>Hiển thị</TableHead>
              <TableHead className={cn(HEAD, 'text-center')}>Nổi bật</TableHead>
              <TableHead className={HEAD}>Phụ trách</TableHead>
              <TableHead className={HEAD}>Cập nhật</TableHead>
              <TableHead className={cn(HEAD, 'w-28 text-right')}>
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }, (_, i) => (
                  <TableRow key={`s-${i}`} className="hover:bg-transparent">
                    {Array.from({ length: sortMode ? 11 : 10 }, (_, j) => (
                      <TableCell key={j} className="h-16 px-3">
                        <Skeleton className={cn('h-4', j === 3 ? 'w-44' : 'w-14')} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row, index) => (
                  <DemoRow key={row.id} row={row} index={index} {...props} />
                ))}
          </TableBody>
        </Table>
        {!isLoading && rows.length === 0 && emptyState}
      </div>
    </div>
  )

  if (!sortMode) return table
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Nhấn Space để nhấc dòng, dùng mũi tên lên xuống để di chuyển, Space để thả, Esc để hủy.',
        },
        announcements: {
          onDragStart: ({ active }) => `Đã nhấc ${nameOf(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${nameOf(active.id)} đang ở vị trí ${ids.indexOf(String(over.id)) + 1}.`
              : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `Đã thả ${nameOf(active.id)} vào vị trí ${ids.indexOf(String(over.id)) + 1}.`
              : `Đã thả ${nameOf(active.id)}.`,
          onDragCancel: ({ active }) => `Đã hủy kéo ${nameOf(active.id)}.`,
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {table}
      </SortableContext>
    </DndContext>
  )
}

function DemoRow({
  row,
  index,
  sortMode,
  canPublish,
  canUpdate,
  isPending,
  onToggleVisibility,
  onToggleFeatured,
}: DemosTableProps & { row: DemoListItem; index: number }) {
  const router = useRouter()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, disabled: !sortMode })
  const style: React.CSSProperties = sortMode
    ? { transform: CSS.Transform.toString(transform), transition: transition }
    : {}
  const target = canUpdate ? routeTo.adminDemoEdit(row.id) : routeTo.demoDetail(row.slug)
  const open = () => {
    if (!sortMode) router.push(target)
  }

  return (
    <TableRow
      ref={sortMode ? setNodeRef : undefined}
      style={style}
      onClick={open}
      onKeyDown={(e) => {
        if (!sortMode && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          open()
        }
      }}
      tabIndex={sortMode ? undefined : 0}
      aria-label={
        sortMode ? undefined : `${row.name}: ${canUpdate ? 'mở trang sửa' : 'mở trang chi tiết'}`
      }
      className={cn(
        'transition-colors duration-150',
        sortMode
          ? 'bg-card'
          : 'hover:bg-muted/40 focus-visible:bg-muted/60 cursor-pointer outline-none',
        isDragging && 'bg-primary/5 relative z-10 shadow-lg'
      )}
    >
      {sortMode && (
        <TableCell className="px-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Kéo để đổi thứ tự ${row.name}`}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 flex size-11 cursor-grab touch-none items-center justify-center rounded-lg outline-none focus-visible:ring-3 active:cursor-grabbing"
          >
            <GripVertical className="size-5" aria-hidden="true" />
          </button>
        </TableCell>
      )}
      <TableCell className="px-3 text-right font-mono text-sm tabular-nums">
        {sortMode ? (index + 1) * 10 : row.sortOrder}
      </TableCell>
      <TableCell className="px-3">
        <DemoThumb name={row.name} coverUrl={row.coverUrl} color={row.industry.color} />
      </TableCell>
      <TableCell className="max-w-72 px-3">
        <span className="block truncate font-medium">{row.name}</span>
        <span className="text-muted-foreground block truncate font-mono text-xs">{row.folder}</span>
      </TableCell>
      <TableCell className="px-3">
        <IndustryBadge name={row.industry.name} color={row.industry.color} />
      </TableCell>
      <TableCell className="px-3">
        <DevStatusBadge status={row.devStatus} />
      </TableCell>
      <TableCell className="px-3">
        <VisibilitySwitch
          demo={row}
          canPublish={canPublish}
          pending={isPending(row.id, 'visibility')}
          onChange={(next) => onToggleVisibility(row, next)}
        />
      </TableCell>
      <TableCell className="px-3 text-center">
        <FeaturedButton
          demo={row}
          canPublish={canPublish}
          pending={isPending(row.id, 'featured')}
          onToggle={(next) => onToggleFeatured(row, next)}
        />
      </TableCell>
      <TableCell className="max-w-40 px-3 text-sm">
        <span className="block truncate">
          {row.ownerName || <span className="text-muted-foreground">—</span>}
        </span>
      </TableCell>
      <TableCell className="px-3 text-sm whitespace-nowrap" title={formatDateTime(row.updatedAt)}>
        {formatRelativeTime(row.updatedAt)}
      </TableCell>
      <TableCell className="px-3 text-right">
        <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button asChild variant="ghost" size="icon" aria-label={`Xem trang chi tiết ${row.name}`}>
            <Link href={routeTo.demoDetail(row.slug)}>
              <Eye />
            </Link>
          </Button>
          {canUpdate && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href={routeTo.adminDemoEdit(row.id)} aria-label={`Sửa ${row.name}`}>
                <Pencil aria-hidden="true" />
                Sửa
              </Link>
            </Button>
          )}
        </span>
      </TableCell>
    </TableRow>
  )
}
