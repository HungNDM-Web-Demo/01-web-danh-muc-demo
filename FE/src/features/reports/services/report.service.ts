import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type { VisitReport, VisitReportQuery } from '../types/report.types'

/** Thống kê `/api/reports/visits` (07-DANH-SACH-API §5). */
const mock = () => import('../mock/report.mock').then((m) => m.reportMock)

export const reportService = {
  visits: async (query: VisitReportQuery): Promise<VisitReport> =>
    isMockMode()
      ? (await mock()).visits(query)
      : apiCall.get<VisitReport>(apiRoutes.reports.visits, {
          params: { from: query.from, to: query.to, industryId: query.industryId || undefined },
        }),
}
