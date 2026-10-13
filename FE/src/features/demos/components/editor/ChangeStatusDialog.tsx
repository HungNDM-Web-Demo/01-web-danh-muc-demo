'use client'

import { useState } from 'react'
import { ArrowRight, CircleX, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors, getMissing } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { useChangeDemoStatus } from '../../hooks/use-demos'
import { demoLimits, isBackward, statusRank } from '../../lib/demo-rules'
import {
  devStatusLabels,
  devStatusOrder,
  type DemoDetail,
  type DemoDevStatus,
} from '../../types/demo.types'
import { DevStatusBadge } from '../DevStatusBadge'

const DESCRIPTIONS: Record<DemoDevStatus, string> = {
  MoiTao: 'Mới khai báo, chưa bắt đầu làm',
  DangLam: 'Đang làm; bật hiển thị thì khách thấy thẻ "Sắp ra mắt"',
  DemoDuoc: 'Chạy được bằng dữ liệu mẫu, khách mở được demo',
  HoanThien: 'Chạy được cả FE và BE thật',
}

type ChangeStatusDialogProps = {
  demo: DemoDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Đổi trạng thái phát triển (FR-21, UC-07, BR-11): tiến lên nhảy bậc không cần lý do;
 * lùi bậc bắt buộc lý do 10–500 ký tự (chưa đủ thì nút Lưu vô hiệu). Thiếu điều kiện BR-02 thì liệt kê từng mục.
 */
export function ChangeStatusDialog({ demo, open, onOpenChange }: ChangeStatusDialogProps) {
  const change = useChangeDemoStatus()
  const [target, setTarget] = useState<DemoDevStatus>(demo.devStatus)
  const [reason, setReason] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const backward = isBackward(demo.devStatus, target)
  const reasonLength = reason.trim().length
  const reasonValid = reasonLength >= demoLimits.reasonMin && reasonLength <= demoLimits.reasonMax
  const canSave = target !== demo.devStatus && (!backward || reasonValid) && !change.isPending

  const reset = () => {
    setTarget(demo.devStatus)
    setReason('')
    setMissing([])
    setError(null)
  }

  const handleSave = () => {
    setMissing([])
    setError(null)
    change.mutate(
      { id: demo.id, request: { status: target, reason: backward ? reason.trim() : null } },
      {
        onSuccess: (detail) => {
          const from = devStatusLabels[demo.devStatus]
          const to = devStatusLabels[detail.devStatus]
          const effects: string[] = []
          if (target === 'MoiTao' && (demo.isVisible || demo.isFeatured))
            effects.push('Đã tự tắt hiển thị và bỏ nổi bật.')
          else if (target === 'DangLam' && demo.isFeatured) effects.push('Đã bỏ nổi bật.')
          if (target === 'DangLam' && demo.isVisible)
            effects.push('Thẻ trên danh mục chuyển "Sắp ra mắt".')
          if (!demo.firstPublishedAt && detail.firstPublishedAt)
            effects.push('Demo đã công khai lần đầu hôm nay.')
          toast.success(`Đã đổi trạng thái: ${from} → ${to}`, {
            description: effects.join(' ') || undefined,
          })
          onOpenChange(false)
          reset()
        },
        onError: (err) => {
          const list = getMissing(err)
          if (list.length) setMissing(list)
          setError(getFieldErrors(err).reason ?? getErrorMessage(err))
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (change.isPending) return
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Đổi trạng thái phát triển</DialogTitle>
          <DialogDescription>
            Hiện tại:{' '}
            <span className="text-foreground font-medium">{devStatusLabels[demo.devStatus]}</span>.
            Tiến lên được nhảy bậc; lùi bậc cần nhập lý do.
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Trạng thái mới" className="grid gap-2">
          {devStatusOrder.map((status) => {
            const checked = target === status
            const current = status === demo.devStatus
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  setTarget(status)
                  setMissing([])
                  setError(null)
                }}
                className={cn(
                  'focus-visible:ring-ring/50 flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3',
                  checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/60'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                    checked ? 'border-primary' : 'border-input'
                  )}
                >
                  {checked && <span className="bg-primary size-2.5 rounded-full" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <DevStatusBadge status={status} />
                    {current && <span className="text-muted-foreground text-xs">Hiện tại</span>}
                    {!current && statusRank(status) < statusRank(demo.devStatus) && (
                      <span className="text-warning text-xs font-medium">Lùi bậc</span>
                    )}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    {DESCRIPTIONS[status]}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {target !== demo.devStatus && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <DevStatusBadge status={demo.devStatus} />
            <ArrowRight className="size-4" aria-hidden="true" />
            <DevStatusBadge status={target} />
          </p>
        )}

        {backward && (
          <div className="grid gap-1.5">
            <Label htmlFor="status-reason">
              Lý do lùi bậc
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Textarea
              id="status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="vd: BE đang nâng cấp phiên bản .NET"
              aria-describedby="status-reason-hint"
              aria-required
            />
            <p
              id="status-reason-hint"
              className={cn(
                'text-xs',
                reasonLength > demoLimits.reasonMax ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {reasonLength}/{demoLimits.reasonMax} ký tự · cần tối thiểu {demoLimits.reasonMin} ký
              tự
            </p>
            {(target === 'DangLam' || target === 'MoiTao') && (
              <p className="bg-warning/10 text-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
                <Info className="text-warning mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {target === 'MoiTao'
                  ? 'Lùi về Mới tạo: hệ thống tự tắt hiển thị và bỏ nổi bật.'
                  : 'Lùi về Đang làm: bỏ nổi bật; nếu đang hiển thị, thẻ trên danh mục chuyển "Sắp ra mắt".'}
              </p>
            )}
          </div>
        )}

        {(error || missing.length > 0) && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 rounded-xl border p-3 text-sm"
          >
            <p className="text-destructive font-medium">{error}</p>
            {missing.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {missing.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CircleX
                      className="text-destructive mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={change.isPending}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {change.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
