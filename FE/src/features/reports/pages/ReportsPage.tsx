'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format, parseISO, subDays } from 'date-fns'
import {
  ChartColumn,
  Eye,
  FileSpreadsheet,
  Loader2,
  MousePointerClick,
  Percent,
} from 'lucide-react'
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { permissions } from '@/config/permissions'
import { routeTo } from '@/config/route-path'
import { localDateKey } from '@/features/demos/lib/date-key'
import { useIndustries } from '@/features/industries/hooks/use-industries'
import { industryClass, industryVars } from '@/features/industries/components/industry-style'
import { getErrorMessage } from '@/lib/api-error'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useVisitReport } from '../hooks/use-reports'
import { exportVisitReport } from '../lib/report-excel'

const ALL = 'all'
const MAX_DAYS = 366
type Preset = '7' | '30' | '90' | 'custom'
const PRESETS: { value: Preset; label: string }[] = [
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
  { value: '90', label: '90 ngày' },
  { value: 'custom', label: 'Tùy chọn' },
]

/** BR-15: tỉ lệ làm tròn 1 chữ số thập phân ("33,3%"); lượt xem bằng 0 hiển thị "—" */
const rateFormatter = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const formatRate = (value?: number | null) =>
  value === null || value === undefined ? '—' : `${rateFormatter.format(value)}%`
const formatShare = (value: number) => `${rateFormatter.format(value)}%`

const rangeOf = (days: number) => ({
  from: localDateKey(subDays(new Date(), days - 1)),
  to: localDateKey(new Date()),
})

const daysBetween = (from: string, to: string) =>
  Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1

const lineConfig = {
  views: { label: 'Lượt xem', color: 'var(--chart-1)' },
  opens: { label: 'Lượt mở demo', color: 'var(--chart-2)' },
} satisfies ChartConfig

const deviceConfig = {
  Mobile: { label: 'Điện thoại', color: 'var(--chart-1)' },
  Desktop: { label: 'Máy tính', color: 'var(--chart-3)' },
} satisfies ChartConfig

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
  loading,
}: {
  label: string
  value: string
  icon: typeof Eye
  hint: string
  loading: boolean
}) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
          <Icon className="size-[1.125rem]" aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-28" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </div>
  )
}

/**
 * SCR-08 Thống kê lượt xem (UC-10, FR-28, FR-29): khoảng ngày (7/30/90/tùy chọn, tối đa 366 ngày),
 * lọc nhóm ngành, 3 thẻ tổng, biểu đồ đường theo ngày, top 10 demo, tỉ trọng nhóm ngành, thiết bị, xuất Excel.
 */
export function ReportsPage() {
  const industries = useIndustries()
  const [preset, setPreset] = useState<Preset>('30')
  const [custom, setCustom] = useState(() => rangeOf(30))
  const [industryId, setIndustryId] = useState(ALL)
  const [exporting, setExporting] = useState(false)

  const range = preset === 'custom' ? custom : rangeOf(Number(preset))
  const rangeError =
    preset !== 'custom'
      ? null
      : !custom.from || !custom.to
        ? 'Chọn đủ ngày bắt đầu và ngày kết thúc'
        : custom.from > custom.to
          ? 'Ngày bắt đầu phải trước ngày kết thúc'
          : daysBetween(custom.from, custom.to) > MAX_DAYS
            ? `Khoảng ngày tối đa ${MAX_DAYS} ngày`
            : null

  const query = {
    from: range.from,
    to: range.to,
    industryId: industryId === ALL ? undefined : industryId,
  }
  const report = useVisitReport(query, !rangeError)
  const data = report.data
  const loading = report.isPending
  const industryName = industries.data?.find((i) => i.id === industryId)?.name ?? null
  const rangeLabel = `${formatDate(range.from)} – ${formatDate(range.to)}`

  const daily = useMemo(
    () => (data?.daily ?? []).map((d) => ({ ...d, label: format(parseISO(d.date), 'dd/MM') })),
    [data]
  )
  const deviceTotal = (data?.byDevice ?? []).reduce((acc, d) => acc + d.views, 0)
  const maxShare = Math.max(1, ...(data?.byIndustry ?? []).map((d) => d.share))

  const handleExport = async () => {
    if (!data) return
    setExporting(true)
    try {
      await exportVisitReport(data, industryName)
      toast.success('Đã xuất file Excel')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không xuất được file Excel.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PermissionGuard permission={permissions.reports.view} redirect>
      <div
        className={cn(
          'space-y-6 transition-opacity duration-200',
          report.isFetching && !loading && 'opacity-70'
        )}
      >
        <PageHeader
          title="Thống kê lượt xem"
          icon={ChartColumn}
          description="Khách xem trang chi tiết và bấm Xem demo; không tính người đang đăng nhập và bot (BR-14)."
          actions={
            <Button variant="outline" onClick={handleExport} disabled={!data || exporting}>
              {exporting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <FileSpreadsheet aria-hidden="true" />
              )}
              Xuất Excel
            </Button>
          }
        />

        {/* Bộ lọc: một hàng phía trên mọi biểu đồ */}
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium" id="range-label">
              Khoảng ngày
            </span>
            <div
              role="radiogroup"
              aria-labelledby="range-label"
              className="bg-muted inline-flex w-fit rounded-lg p-1"
            >
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={preset === p.value}
                  onClick={() => {
                    if (p.value === 'custom' && preset !== 'custom') setCustom(range)
                    setPreset(p.value)
                  }}
                  className={cn(
                    'focus-visible:ring-ring/50 h-9 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3',
                    preset === p.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {preset === 'custom' && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="report-from">Từ ngày</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={custom.from}
                  max={custom.to || undefined}
                  onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                  aria-invalid={!!rangeError}
                  className="w-44"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="report-to">Đến ngày</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={custom.to}
                  min={custom.from || undefined}
                  onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                  aria-invalid={!!rangeError}
                  className="w-44"
                />
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="report-industry">Nhóm ngành</Label>
            <Select value={industryId} onValueChange={setIndustryId}>
              <SelectTrigger id="report-industry" className="w-52">
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
          </div>
          <p className="text-muted-foreground text-sm lg:ml-auto lg:pb-2" aria-live="polite">
            {rangeError ? (
              <span className="text-destructive font-medium">{rangeError}</span>
            ) : (
              `${rangeLabel} · ${daysBetween(range.from, range.to)} ngày`
            )}
          </p>
        </div>

        {report.error ? (
          <div className="bg-card rounded-xl border">
            <ErrorState error={report.error} onRetry={() => report.refetch()} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Kpi
                label="Lượt xem"
                icon={Eye}
                loading={loading}
                value={formatNumber(data?.totals.views ?? 0, 0)}
                hint="Lượt mở trang chi tiết demo"
              />
              <Kpi
                label="Lượt mở demo"
                icon={MousePointerClick}
                loading={loading}
                value={formatNumber(data?.totals.opens ?? 0, 0)}
                hint='Lượt bấm "Xem demo"'
              />
              <Kpi
                label="Tỉ lệ mở demo"
                icon={Percent}
                loading={loading}
                value={formatRate(data?.totals.openRate)}
                hint="Lượt mở ÷ lượt xem"
              />
            </div>

            <section
              aria-labelledby="daily-title"
              className="bg-card rounded-xl border p-4 shadow-xs sm:p-6"
            >
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="daily-title" className="text-base font-semibold">
                  Lượt xem và lượt mở demo theo ngày
                </h2>
                <span className="text-muted-foreground text-sm">
                  {industryName ?? 'Mọi nhóm ngành'}
                </span>
              </div>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <ChartContainer config={lineConfig} className="aspect-auto h-72 w-full">
                  <LineChart
                    data={daily}
                    margin={{ left: 0, right: 12, top: 8 }}
                    accessibilityLayer
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                    />
                    <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                    <ChartTooltip
                      cursor
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          labelFormatter={(_, payload) => {
                            const row = payload?.[0]?.payload as (typeof daily)[number] | undefined
                            return row
                              ? `${formatDate(row.date)} · tỉ lệ mở ${formatRate(row.openRate)}`
                              : ''
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      dataKey="views"
                      type="monotone"
                      stroke="var(--color-views)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      dataKey="opens"
                      type="monotone"
                      stroke="var(--color-opens)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
              {data && (
                <details className="mt-3 text-sm">
                  <summary className="text-primary w-fit cursor-pointer font-medium underline-offset-4 hover:underline">
                    Xem bảng số liệu theo ngày
                  </summary>
                  <div className="mt-2 max-h-72 overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0">
                        <TableRow>
                          <TableHead>Ngày</TableHead>
                          <TableHead className="text-right">Lượt xem</TableHead>
                          <TableHead className="text-right">Lượt mở</TableHead>
                          <TableHead className="text-right">Tỉ lệ mở</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...data.daily].reverse().map((d) => (
                          <TableRow key={d.date}>
                            <TableCell className="tabular-nums">{formatDate(d.date)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatNumber(d.views, 0)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatNumber(d.opens, 0)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatRate(d.openRate)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </details>
              )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <section
                aria-labelledby="top-title"
                className="bg-card overflow-hidden rounded-xl border shadow-xs"
              >
                <h2 id="top-title" className="px-4 pt-4 text-base font-semibold sm:px-6 sm:pt-6">
                  Top 10 demo nhiều lượt xem
                </h2>
                <div className="mt-3 overflow-x-auto">
                  <Table className="min-w-[520px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10 pl-4 sm:pl-6">#</TableHead>
                        <TableHead>Demo</TableHead>
                        <TableHead className="text-right">Lượt xem</TableHead>
                        <TableHead className="text-right">Lượt mở</TableHead>
                        <TableHead className="pr-4 text-right sm:pr-6">Tỉ lệ mở</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading
                        ? Array.from({ length: 6 }, (_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={5} className="px-4 sm:px-6">
                                <Skeleton className="h-5 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        : data?.topDemos.map((d, i) => (
                            <TableRow key={d.demoId}>
                              <TableCell className="text-muted-foreground pl-4 tabular-nums sm:pl-6">
                                {i + 1}
                              </TableCell>
                              <TableCell className="font-medium">
                                <Link
                                  href={routeTo.demoDetail(d.slug)}
                                  className="hover:text-primary underline-offset-4 hover:underline"
                                >
                                  {d.name}
                                </Link>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(d.views, 0)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(d.opens, 0)}
                              </TableCell>
                              <TableCell className="pr-4 text-right tabular-nums sm:pr-6">
                                {formatRate(d.openRate)}
                              </TableCell>
                            </TableRow>
                          ))}
                      {!loading && data?.topDemos.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-muted-foreground py-10 text-center"
                          >
                            Chưa có lượt xem trong khoảng ngày này
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <div className="grid gap-6">
                <section
                  aria-labelledby="industry-title"
                  className="bg-card rounded-xl border p-4 shadow-xs sm:p-6"
                >
                  <h2 id="industry-title" className="text-base font-semibold">
                    Tỉ trọng theo nhóm ngành
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Theo lượt xem, tính trên mọi nhóm ngành
                  </p>
                  {loading ? (
                    <Skeleton className="mt-4 h-48 w-full" />
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {data?.byIndustry.map((row) => (
                        <li
                          key={row.industryId}
                          style={industryVars(row.color)}
                          className={cn(
                            'space-y-1',
                            industryId !== ALL && row.industryId !== industryId && 'opacity-55'
                          )}
                        >
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn('size-2.5 shrink-0 rounded-full', industryClass.dot)}
                                aria-hidden="true"
                              />
                              <span className="truncate font-medium">{row.name}</span>
                            </span>
                            <span className="text-muted-foreground shrink-0 tabular-nums">
                              <span className="text-foreground font-semibold">
                                {formatShare(row.share)}
                              </span>{' '}
                              · {formatNumber(row.views, 0)} xem · {formatNumber(row.opens, 0)} mở
                            </span>
                          </div>
                          <div
                            className="bg-muted h-2 overflow-hidden rounded-full"
                            aria-hidden="true"
                          >
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${(row.share / maxShare) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                      {data?.byIndustry.length === 0 && (
                        <li className="text-muted-foreground text-sm">Chưa có số liệu.</li>
                      )}
                    </ul>
                  )}
                </section>

                <section
                  aria-labelledby="device-title"
                  className="bg-card rounded-xl border p-4 shadow-xs sm:p-6"
                >
                  <h2 id="device-title" className="text-base font-semibold">
                    Theo thiết bị
                  </h2>
                  {loading ? (
                    <Skeleton className="mt-4 h-44 w-full" />
                  ) : (
                    <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
                      <ChartContainer config={deviceConfig} className="aspect-square h-44 shrink-0">
                        <PieChart accessibilityLayer>
                          <ChartTooltip
                            content={<ChartTooltipContent nameKey="device" hideLabel />}
                          />
                          <Pie
                            data={data?.byDevice ?? []}
                            dataKey="views"
                            nameKey="device"
                            innerRadius="58%"
                            outerRadius="92%"
                            strokeWidth={2}
                            stroke="var(--card)"
                          >
                            {(data?.byDevice ?? []).map((d) => (
                              <Cell key={d.device} fill={`var(--color-${d.device})`} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      <ul className="w-full space-y-3">
                        {data?.byDevice.map((d) => (
                          <li
                            key={d.device}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className="size-3 rounded-sm"
                                style={{
                                  background:
                                    d.device === 'Mobile' ? 'var(--chart-1)' : 'var(--chart-3)',
                                }}
                                aria-hidden="true"
                              />
                              {d.device === 'Mobile' ? 'Điện thoại' : 'Máy tính'}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              <span className="text-foreground font-semibold">
                                {formatShare(d.share)}
                              </span>{' '}
                              · {formatNumber(d.views, 0)}
                            </span>
                          </li>
                        ))}
                        <li className="text-muted-foreground border-t pt-2 text-xs">
                          Tổng {formatNumber(deviceTotal, 0)} lượt xem
                        </li>
                      </ul>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </PermissionGuard>
  )
}
