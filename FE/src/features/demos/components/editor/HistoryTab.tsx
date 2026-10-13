'use client'

import { ArrowRight, History, UserRound } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import { useStatusHistory } from '../../hooks/use-demos'
import { DevStatusBadge } from '../DevStatusBadge'
import { EditorSection } from './EditorSection'

/** Tab Lịch sử (FR-21): trạng thái cũ → mới, lý do, người đổi, thời điểm; mới nhất trước. */
export function HistoryTab({ demoId }: { demoId: string }) {
  const history = useStatusHistory(demoId)

  return (
    <EditorSection
      title="Lịch sử đổi trạng thái"
      description="Mỗi lần đổi trạng thái phát triển đều được lưu lại."
    >
      {history.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : history.error ? (
        <ErrorState error={history.error} onRetry={() => history.refetch()} />
      ) : !history.data.length ? (
        <EmptyState icon={History} title="Chưa có lịch sử" compact />
      ) : (
        <ol className="relative space-y-4 border-l pl-6">
          {history.data.map((item, index) => (
            <li key={`${item.changedAt}-${index}`} className="relative">
              <span
                className="bg-primary ring-background absolute top-1.5 -left-[1.95rem] size-3 rounded-full ring-4"
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-center gap-2">
                {item.fromStatus ? (
                  <>
                    <DevStatusBadge status={item.fromStatus} />
                    <ArrowRight className="text-muted-foreground size-4" aria-label="sang" />
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">Tạo demo</span>
                )}
                <DevStatusBadge status={item.toStatus} />
              </div>
              {item.reason && <p className="mt-1.5 text-sm text-pretty">Lý do: {item.reason}</p>}
              <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3.5" aria-hidden="true" />
                  {item.changedByName}
                </span>
                <span title={formatDateTime(item.changedAt)}>
                  {formatDateTime(item.changedAt)} · {formatRelativeTime(item.changedAt)}
                </span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </EditorSection>
  )
}
