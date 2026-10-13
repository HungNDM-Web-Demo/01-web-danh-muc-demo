import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { requirePermission } from '@/mock/mock-auth'
import { validation } from '@/mock/mock-errors'
import { openRate, sharePercent } from '@/features/demos/lib/demo-rules'
import { demosDb, industriesDb, visitStatsDb } from '@/features/demos/mock/demo.db'
import { localDateKey } from '@/features/demos/lib/date-key'
import type { VisitReport, VisitReportQuery } from '../types/report.types'

/** Khoảng ngày tối đa của báo cáo */
export const REPORT_MAX_DAYS = 366

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null
}

function eachDate(from: Date, to: Date): string[] {
  const list: string[] = []
  const cursor = new Date(from)
  while (cursor <= to) {
    list.push(localDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return list
}

/**
 * GET /api/reports/visits ở chế độ mock (FR-28, BR-15), chỉ đọc bảng tổng hợp ngày.
 * Lọc nhóm ngành áp cho tổng, theo ngày, top demo, thiết bị; tỉ trọng nhóm ngành luôn tính trên mọi nhóm.
 */
export const reportMock = {
  async visits(query: VisitReportQuery): Promise<VisitReport> {
    await mockDelay(250, 450)
    requirePermission(permissions.reports.view)

    const from = parseDate(query.from)
    const to = parseDate(query.to)
    if (!from || !to) throw validation({ from: 'Chọn khoảng ngày hợp lệ' })
    if (from > to) throw validation({ from: 'Ngày bắt đầu phải trước ngày kết thúc' })
    const dates = eachDate(from, to)
    if (dates.length > REPORT_MAX_DAYS) {
      throw validation(
        { from: `Khoảng ngày tối đa ${REPORT_MAX_DAYS} ngày` },
        `Khoảng ngày tối đa ${REPORT_MAX_DAYS} ngày.`
      )
    }

    const demos = demosDb.all()
    const industries = industriesDb.all()
    const demoById = new Map(demos.map((d) => [d.id, d]))
    const inRange = visitStatsDb.filter(
      (s) => s.date >= query.from && s.date <= query.to && demoById.has(s.demoId)
    )
    const filtered = query.industryId
      ? inRange.filter((s) => demoById.get(s.demoId)?.industryId === query.industryId)
      : inRange

    const views = filtered.reduce((acc, s) => acc + s.views, 0)
    const opens = filtered.reduce((acc, s) => acc + s.opens, 0)

    const byDate = new Map<string, { views: number; opens: number }>()
    for (const s of filtered) {
      const row = byDate.get(s.date) ?? { views: 0, opens: 0 }
      row.views += s.views
      row.opens += s.opens
      byDate.set(s.date, row)
    }

    const byDemo = new Map<string, { views: number; opens: number }>()
    for (const s of filtered) {
      const row = byDemo.get(s.demoId) ?? { views: 0, opens: 0 }
      row.views += s.views
      row.opens += s.opens
      byDemo.set(s.demoId, row)
    }

    const allViews = inRange.reduce((acc, s) => acc + s.views, 0)
    const byIndustry = industries
      .map((industry) => {
        const rows = inRange.filter((s) => demoById.get(s.demoId)?.industryId === industry.id)
        const v = rows.reduce((acc, s) => acc + s.views, 0)
        const o = rows.reduce((acc, s) => acc + s.opens, 0)
        return {
          industryId: industry.id,
          name: industry.name,
          color: industry.color,
          views: v,
          opens: o,
          share: sharePercent(v, allViews),
        }
      })
      .filter((row) => row.views > 0 || row.opens > 0)
      .sort((a, b) => b.views - a.views)

    const mobile = filtered.reduce((acc, s) => acc + s.mobileViews, 0)
    const desktop = filtered.reduce((acc, s) => acc + s.desktopViews, 0)

    return {
      from: query.from,
      to: query.to,
      totals: { views, opens, openRate: openRate(opens, views) },
      daily: dates.map((date) => {
        const row = byDate.get(date) ?? { views: 0, opens: 0 }
        return {
          date,
          views: row.views,
          opens: row.opens,
          openRate: openRate(row.opens, row.views),
        }
      }),
      topDemos: [...byDemo.entries()]
        .map(([demoId, row]) => {
          const demo = demoById.get(demoId)!
          return {
            demoId,
            name: demo.name,
            slug: demo.slug,
            views: row.views,
            opens: row.opens,
            openRate: openRate(row.opens, row.views),
          }
        })
        .sort((a, b) => b.views - a.views || b.opens - a.opens)
        .slice(0, 10),
      byIndustry,
      byDevice: [
        { device: 'Mobile', views: mobile, share: sharePercent(mobile, mobile + desktop) },
        { device: 'Desktop', views: desktop, share: sharePercent(desktop, mobile + desktop) },
      ],
    }
  },
}
