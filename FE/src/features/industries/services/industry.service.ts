import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type {
  Industry,
  ReorderIndustriesRequest,
  SaveIndustryRequest,
} from '../types/industry.types'

/** Nhóm ngành `/api/industries` (07-DANH-SACH-API §4). */
const mock = () => import('../mock/industry.mock').then((m) => m.industryMock)

export const industryService = {
  list: async (): Promise<Industry[]> =>
    isMockMode() ? (await mock()).list() : apiCall.get<Industry[]>(apiRoutes.industries.list),

  create: async (request: SaveIndustryRequest): Promise<Industry> =>
    isMockMode()
      ? (await mock()).create(request)
      : apiCall.post<Industry>(apiRoutes.industries.list, request),

  update: async (id: string, request: SaveIndustryRequest): Promise<Industry> =>
    isMockMode()
      ? (await mock()).update(id, request)
      : apiCall.put<Industry>(apiRoutes.industries.detail(id), request),

  /** BR-13: còn demo thì lỗi "Nhóm đang có N demo" */
  remove: async (id: string): Promise<void> =>
    isMockMode() ? (await mock()).remove(id) : apiCall.delete(apiRoutes.industries.detail(id)),

  reorder: async (request: ReorderIndustriesRequest): Promise<void> =>
    isMockMode()
      ? (await mock()).reorder(request)
      : apiCall.put(apiRoutes.industries.order, request),
}
