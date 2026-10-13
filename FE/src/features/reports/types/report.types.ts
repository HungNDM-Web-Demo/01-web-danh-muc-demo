/** DTO thống kê, khớp 07-DANH-SACH-API §5. `share` là phần trăm làm tròn 1 chữ số; `openRate` theo BR-15. */

export type VisitReportQuery = {
  /** yyyy-MM-dd */
  from: string
  /** yyyy-MM-dd */
  to: string
  industryId?: string
}

export type VisitReport = {
  from: string
  to: string
  /** openRate null khi views = 0 (BR-15) */
  totals: { views: number; opens: number; openRate?: number | null }
  /** Đủ mọi ngày trong khoảng */
  daily: { date: string; views: number; opens: number; openRate?: number | null }[]
  /** Tối đa 10 */
  topDemos: {
    demoId: string
    name: string
    slug: string
    views: number
    opens: number
    openRate?: number | null
  }[]
  byIndustry: {
    industryId: string
    name: string
    color: string
    views: number
    opens: number
    share: number
  }[]
  byDevice: { device: 'Mobile' | 'Desktop'; views: number; share: number }[]
}
