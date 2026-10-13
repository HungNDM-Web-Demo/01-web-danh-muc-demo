import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type {
  PublicDemoCard,
  PublicDemoLookup,
  PublicIndustry,
  RecordVisitRequest,
  RecordVisitResponse,
} from '../types/catalog.types'

/**
 * API công khai `/api/public/*` (07-DANH-SACH-API §2) phía trình duyệt.
 * Handler mock nạp lười (import động): ở chế độ api trình duyệt không tải mã và dữ liệu mẫu (BR-10).
 */
const mock = () => import('../mock/catalog.mock').then((m) => m.catalogMock)

export const catalogService = {
  getIndustries: async (): Promise<PublicIndustry[]> =>
    isMockMode()
      ? (await mock()).getIndustries()
      : apiCall.get<PublicIndustry[]>(apiRoutes.public.industries),

  getDemos: async (): Promise<PublicDemoCard[]> =>
    isMockMode()
      ? (await mock()).getDemos()
      : apiCall.get<PublicDemoCard[]>(apiRoutes.public.demos),

  /** Không có hoặc không hiển thị → ApiError 404 */
  getDemo: async (slug: string): Promise<PublicDemoLookup> =>
    isMockMode()
      ? (await mock()).getDemo(slug)
      : apiCall.get<PublicDemoLookup>(apiRoutes.public.demo(slug)),

  /** BR-14: BE bỏ qua khi có header Authorization hoặc user agent là bot */
  recordVisit: async (slug: string, request: RecordVisitRequest): Promise<RecordVisitResponse> =>
    isMockMode()
      ? (await mock()).recordVisit(slug, request)
      : apiCall.post<RecordVisitResponse>(apiRoutes.public.visits(slug), request),
}
