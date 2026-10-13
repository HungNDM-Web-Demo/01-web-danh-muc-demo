import { cn } from '@/lib/utils'

/** Khối nhóm ô nhập trong trang sửa demo. */
export function EditorSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('bg-card rounded-xl border p-4 shadow-xs sm:p-6', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-muted-foreground text-sm text-pretty">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

/** Bộ đếm ký tự / số mục, đỏ khi vượt giới hạn. */
export function Counter({
  value,
  max,
  min,
  suffix,
}: {
  value: number
  max: number
  min?: number
  suffix?: string
}) {
  const bad = value > max || (min !== undefined && value > 0 && value < min)
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        bad ? 'text-destructive font-medium' : 'text-muted-foreground'
      )}
    >
      {value}/{max}
      {suffix}
    </span>
  )
}
