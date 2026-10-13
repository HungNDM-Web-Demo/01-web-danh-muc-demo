'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CircleCheck,
  CircleX,
  GripVertical,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { DemoCoverArt } from '@/features/catalog/components/DemoCoverArt'
import { DemoImage } from '@/features/catalog/components/DemoImage'
import { getErrorMessage } from '@/lib/api-error'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDeleteScreenshot, useUploadScreenshots } from '../../hooks/use-demos'
import { demoLimits } from '../../lib/demo-rules'
import { checkScreenshots } from '../../lib/screenshot-check'
import type { Screenshot } from '../../types/demo.types'

type UploadRow = {
  key: string
  name: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  reason?: string
}

type ScreenshotsManagerProps = {
  demoId: string
  demoName: string
  color: string
  /** Danh sách ảnh đang chỉnh (thứ tự, chú thích, ảnh đại diện chưa lưu) */
  items: Screenshot[]
  onItemsChange: (items: Screenshot[]) => void
  canEdit: boolean
}

const formatSize = (bytes: number) =>
  bytes <= 0
    ? ''
    : bytes >= 1024 * 1024
      ? `${formatNumber(bytes / 1024 / 1024, 1)} MB`
      : `${Math.round(bytes / 1024)} KB`

/**
 * Tab Ảnh chụp (UC-06, FR-18, BR-07): kéo thả nhiều file, kiểm tra ngay trên trình duyệt (định dạng, 2 MB,
 * rộng ≥ 1280 px, tối đa 8 ảnh) với lý do riêng từng ảnh, tiến độ tải từng ảnh; lưới ảnh kéo thả sắp xếp,
 * chú thích, đặt ảnh đại diện, xóa có xác nhận (BR-02: không xóa ảnh cuối của demo công khai).
 */
export function ScreenshotsManager({
  demoId,
  demoName,
  color,
  items,
  onItemsChange,
  canEdit,
}: ScreenshotsManagerProps) {
  const upload = useUploadScreenshots()
  const remove = useDeleteScreenshot()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [checking, setChecking] = useState(false)
  const [rejected, setRejected] = useState<{ fileName: string; reason: string }[]>([])
  const [uploads, setUploads] = useState<UploadRow[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Screenshot | null>(null)
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const full = items.length >= demoLimits.screenshotsMax
  const busy = checking || uploads.some((u) => u.status === 'uploading')

  const handleFiles = async (list: FileList | File[]) => {
    const files = Array.from(list)
    if (!files.length || !canEdit) return
    setChecking(true)
    const result = await checkScreenshots(files, itemsRef.current.length)
    setChecking(false)
    setRejected(result.rejected)
    if (!result.accepted.length) return

    const rows = result.accepted.map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
      status: 'uploading' as const,
      progress: 5,
    }))
    setUploads(rows)
    // Tải từng ảnh để hiện tiến độ riêng (UC-06 bước 2). Giữ danh sách gốc lúc bắt đầu và cộng dồn ảnh
    // đã tải: không lấy lại items giữa chừng, vì query đang nạp lại sau mỗi ảnh có thể trả bản cũ thiếu ảnh,
    // làm thứ tự hiện ra lệch so với thứ tự chọn (TC-27).
    const base = itemsRef.current
    const addedAll: Screenshot[] = []
    for (const [i, file] of result.accepted.entries()) {
      const key = rows[i].key
      try {
        const res = await upload.mutateAsync({
          id: demoId,
          files: [file],
          onProgress: (p) =>
            setUploads((cur) =>
              cur.map((u) => (u.key === key ? { ...u, progress: Math.max(u.progress, p) } : u))
            ),
        })
        if (res.rejected.length) {
          setRejected((cur) => [...cur, ...res.rejected])
          setUploads((cur) =>
            cur.map((u) =>
              u.key === key ? { ...u, status: 'error', reason: res.rejected[0].reason } : u
            )
          )
        } else {
          const hasCover = [...base, ...addedAll].some((s) => s.isCover)
          const added = res.accepted.map((s, index) => ({
            ...s,
            isCover: !hasCover && index === 0,
          }))
          addedAll.push(...added)
          const next = [...base, ...addedAll]
          onItemsChange(next)
          itemsRef.current = next
          setUploads((cur) =>
            cur.map((u) => (u.key === key ? { ...u, status: 'done', progress: 100 } : u))
          )
        }
      } catch (error) {
        const reason = getErrorMessage(error)
        setUploads((cur) => cur.map((u) => (u.key === key ? { ...u, status: 'error', reason } : u)))
      }
    }
  }

  const setCover = (id: string) => onItemsChange(items.map((s) => ({ ...s, isCover: s.id === id })))

  const setCaption = (id: string, caption: string) =>
    onItemsChange(items.map((s) => (s.id === id ? { ...s, caption } : s)))

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((s) => s.id === active.id)
    const to = items.findIndex((s) => s.id === over.id)
    if (from >= 0 && to >= 0) onItemsChange(arrayMove(items, from, to))
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const server = await remove.mutateAsync({ id: demoId, screenshotId: deleteTarget.id })
      const serverCover = server.find((s) => s.isCover)?.id
      const rest = items.filter((s) => s.id !== deleteTarget.id)
      const next = deleteTarget.isCover
        ? rest.map((s) => ({ ...s, isCover: s.id === serverCover }))
        : rest
      onItemsChange(next)
      toast.success('Đã xóa ảnh', {
        description:
          deleteTarget.isCover && next.length ? 'Ảnh kế tiếp đã thành ảnh đại diện.' : undefined,
      })
    } catch (error) {
      // Bị từ chối (ảnh cuối của demo công khai, BR-02) thì thử lại cũng không được: báo lỗi và đóng hộp thoại
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="space-y-5">
      {canEdit && (
        <label
          htmlFor="screenshot-files"
          onDragOver={(e) => {
            e.preventDefault()
            if (!full) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (!full && !busy) void handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            'has-[:focus-visible]:ring-ring/50 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:ring-3',
            full || busy
              ? 'bg-muted/40 cursor-not-allowed opacity-70'
              : 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer',
            dragOver && 'border-primary bg-primary/5'
          )}
        >
          <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            {busy ? (
              <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-6" aria-hidden="true" />
            )}
          </span>
          <span className="font-medium">
            {full
              ? `Đã đủ ${demoLimits.screenshotsMax} ảnh`
              : 'Kéo thả ảnh vào đây hoặc bấm để chọn'}
          </span>
          <span className="text-muted-foreground text-sm">
            JPG, PNG, WebP · tối đa 2 MB · rộng từ 1280 px · tối đa {demoLimits.screenshotsMax} ảnh
            (còn {Math.max(0, demoLimits.screenshotsMax - items.length)})
          </span>
          <input
            ref={inputRef}
            id="screenshot-files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={full || busy}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      )}

      {(uploads.length > 0 || rejected.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {uploads.length > 0 && (
            <section
              aria-label="Tiến độ tải ảnh"
              className="bg-card space-y-2 rounded-xl border p-4"
            >
              <h3 className="text-sm font-semibold">Tiến độ tải</h3>
              <ul className="space-y-2">
                {uploads.map((u) => (
                  <li key={u.key} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      {u.status === 'done' ? (
                        <CircleCheck className="text-success size-4 shrink-0" aria-hidden="true" />
                      ) : u.status === 'error' ? (
                        <CircleX className="text-destructive size-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <Loader2
                          className="text-muted-foreground size-4 shrink-0 animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate">{u.name}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {u.status === 'error' ? u.reason : `${u.progress}%`}
                      </span>
                    </div>
                    {u.status === 'uploading' && (
                      <Progress
                        value={u.progress}
                        className="h-1.5"
                        aria-label={`Đang tải ${u.name}`}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {rejected.length > 0 && (
            <section
              role="alert"
              aria-label="Ảnh bị từ chối"
              className="border-destructive/30 bg-destructive/5 space-y-2 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-destructive text-sm font-semibold">
                  Ảnh bị từ chối ({rejected.length})
                </h3>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRejected([])}
                  aria-label="Ẩn danh sách ảnh bị từ chối"
                >
                  <X />
                </Button>
              </div>
              <ul className="space-y-1.5 text-sm">
                {rejected.map((r, i) => (
                  <li key={`${r.fileName}-${i}`} className="flex items-start gap-2">
                    <CircleX
                      className="text-destructive mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="font-medium break-all">{r.fileName}</span>: {r.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center sm:flex-row sm:text-left">
          <span className="relative block aspect-[16/10] w-40 shrink-0 overflow-hidden rounded-lg border">
            <DemoCoverArt name={demoName} color={color} />
          </span>
          <p className="text-muted-foreground text-sm text-pretty">
            Chưa có ảnh chụp. Trang công khai đang dùng ảnh mặc định theo màu nhóm ngành; demo Demo
            được, Hoàn thiện cần ít nhất 1 ảnh để hiển thị.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((s) => s.id)} strategy={rectSortingStrategy}>
            <ul
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-label="Ảnh chụp, kéo để đổi thứ tự"
            >
              {items.map((shot, index) => (
                <ShotTile
                  key={shot.id}
                  shot={shot}
                  index={index}
                  demoName={demoName}
                  color={color}
                  canEdit={canEdit}
                  onCaption={(caption) => setCaption(shot.id, caption)}
                  onCover={() => setCover(shot.id)}
                  onDelete={() => setDeleteTarget(shot)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        variant="destructive"
        icon={Trash2}
        title="Xóa ảnh chụp này?"
        description={
          deleteTarget?.isCover
            ? 'Đây là ảnh đại diện; ảnh kế tiếp sẽ thành ảnh đại diện. Không hoàn tác được.'
            : 'Ảnh bị xóa khỏi thư viện của demo. Không hoàn tác được.'
        }
        confirmText="Xóa ảnh"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function ShotTile({
  shot,
  index,
  demoName,
  color,
  canEdit,
  onCaption,
  onCover,
  onDelete,
}: {
  shot: Screenshot
  index: number
  demoName: string
  color: string
  canEdit: boolean
  onCaption: (caption: string) => void
  onCover: () => void
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
  } = useSortable({ id: shot.id, disabled: !canEdit })
  const caption = shot.caption ?? ''
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: transition }}
      className={cn(
        'bg-card overflow-hidden rounded-xl border shadow-xs',
        shot.isCover && 'border-primary/60 ring-primary/20 ring-2',
        isDragging && 'relative z-10 shadow-lg'
      )}
    >
      <div className="bg-muted relative aspect-[16/10]">
        <DemoImage
          src={shot.url}
          alt={shot.caption || `${demoName}: ảnh ${index + 1}`}
          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
          fallback={<DemoCoverArt name={demoName} color={color} />}
        />
        <span className="bg-background/90 absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm">
          {index + 1}
        </span>
        {shot.isCover && (
          <span className="bg-primary text-primary-foreground absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm">
            <Star className="size-3.5 fill-current" aria-hidden="true" />
            Đại diện
          </span>
        )}
        {canEdit && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Kéo để đổi thứ tự ảnh ${index + 1}`}
            className="bg-background/90 text-foreground focus-visible:ring-ring/50 absolute top-2 left-2 flex size-10 cursor-grab touch-none items-center justify-center rounded-lg shadow-sm outline-none focus-visible:ring-3 active:cursor-grabbing"
          >
            <GripVertical className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="space-y-1">
          <label
            htmlFor={`caption-${shot.id}`}
            className="text-muted-foreground text-xs font-medium"
          >
            Chú thích ảnh {index + 1}
          </label>
          <Input
            id={`caption-${shot.id}`}
            value={caption}
            maxLength={demoLimits.captionMax}
            disabled={!canEdit}
            onChange={(e) => onCaption(e.target.value)}
            placeholder="vd: Màn bán hàng trên tablet"
          />
          <p className="text-muted-foreground flex justify-between text-xs">
            <span>
              {shot.width}×{shot.height}
              {formatSize(shot.sizeBytes) && ` · ${formatSize(shot.sizeBytes)}`}
            </span>
            <span className="tabular-nums">
              {caption.length}/{demoLimits.captionMax}
            </span>
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {!shot.isCover && (
              <Button variant="outline" size="sm" className="h-9 flex-1" onClick={onCover}>
                <Star aria-hidden="true" />
                Đặt làm đại diện
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              className={cn('h-9', shot.isCover && 'flex-1')}
              onClick={onDelete}
              aria-label={`Xóa ảnh ${index + 1}`}
            >
              <Trash2 aria-hidden="true" />
              {shot.isCover && 'Xóa ảnh'}
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}
