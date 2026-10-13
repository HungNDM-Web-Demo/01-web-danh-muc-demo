import type { AxiosProgressEvent } from 'axios'
import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type {
  ChangeStatusRequest,
  DemoDetail,
  DemoListItem,
  DemoSummary,
  ReorderDemosRequest,
  SaveDemoRequest,
  Screenshot,
  SetFeaturedRequest,
  SetVisibilityRequest,
  StatusHistoryItem,
  UpdateScreenshotsRequest,
  UploadScreenshotsResult,
} from '../types/demo.types'

/**
 * Quản lý demo `/api/demos/*` (07-DANH-SACH-API §3). Service tự chọn mock hoặc API.
 * Handler mock nạp lười để trang công khai không kéo theo dữ liệu mẫu ở chế độ api (BR-10).
 */
const mock = () => import('../mock/demo.mock').then((m) => m.demoMock)

export const demoService = {
  list: async (): Promise<DemoListItem[]> =>
    isMockMode() ? (await mock()).list() : apiCall.get<DemoListItem[]>(apiRoutes.demos.list),

  summary: async (): Promise<DemoSummary> =>
    isMockMode() ? (await mock()).summary() : apiCall.get<DemoSummary>(apiRoutes.demos.summary),

  nextNumber: async (): Promise<{ number: number }> =>
    isMockMode()
      ? (await mock()).nextNumber()
      : apiCall.get<{ number: number }>(apiRoutes.demos.nextNumber),

  get: async (id: string): Promise<DemoDetail> =>
    isMockMode() ? (await mock()).get(id) : apiCall.get<DemoDetail>(apiRoutes.demos.detail(id)),

  /** Khung nội bộ, xem trước demo chưa công khai (cần demos.view-internal) */
  getBySlug: async (slug: string): Promise<DemoDetail> =>
    isMockMode()
      ? (await mock()).getBySlug(slug)
      : apiCall.get<DemoDetail>(apiRoutes.demos.bySlug(slug)),

  create: async (request: SaveDemoRequest): Promise<DemoDetail> =>
    isMockMode()
      ? (await mock()).create(request)
      : apiCall.post<DemoDetail>(apiRoutes.demos.list, request),

  update: async (id: string, request: SaveDemoRequest): Promise<DemoDetail> =>
    isMockMode()
      ? (await mock()).update(id, request)
      : apiCall.put<DemoDetail>(apiRoutes.demos.detail(id), request),

  remove: async (id: string): Promise<void> =>
    isMockMode() ? (await mock()).remove(id) : apiCall.delete(apiRoutes.demos.detail(id)),

  changeStatus: async (id: string, request: ChangeStatusRequest): Promise<DemoDetail> =>
    isMockMode()
      ? (await mock()).changeStatus(id, request)
      : apiCall.patch<DemoDetail>(apiRoutes.demos.status(id), request),

  setVisibility: async (id: string, request: SetVisibilityRequest): Promise<DemoDetail> =>
    isMockMode()
      ? (await mock()).setVisibility(id, request)
      : apiCall.patch<DemoDetail>(apiRoutes.demos.visibility(id), request),

  setFeatured: async (id: string, request: SetFeaturedRequest): Promise<DemoDetail> =>
    isMockMode()
      ? (await mock()).setFeatured(id, request)
      : apiCall.patch<DemoDetail>(apiRoutes.demos.featured(id), request),

  reorder: async (request: ReorderDemosRequest): Promise<void> =>
    isMockMode() ? (await mock()).reorder(request) : apiCall.put(apiRoutes.demos.order, request),

  statusHistory: async (id: string): Promise<StatusHistoryItem[]> =>
    isMockMode()
      ? (await mock()).statusHistory(id)
      : apiCall.get<StatusHistoryItem[]>(apiRoutes.demos.statusHistory(id)),

  /** Multipart, field `files`; `onProgress` nhận 0–100 */
  uploadScreenshots: async (
    id: string,
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<UploadScreenshotsResult> => {
    if (isMockMode()) {
      onProgress?.(35)
      const result = await (await mock()).uploadScreenshots(id, files)
      onProgress?.(100)
      return result
    }
    const form = new FormData()
    files.forEach((file) => form.append('files', file))
    return apiCall.post<UploadScreenshotsResult>(apiRoutes.demos.screenshots(id), form, {
      // Bắt buộc ghi đè Content-Type JSON mặc định của lib/axios.ts, nếu không axios đổi FormData thành JSON;
      // trình duyệt tự thêm boundary
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
      },
    })
  },

  updateScreenshots: async (
    id: string,
    request: UpdateScreenshotsRequest
  ): Promise<Screenshot[]> =>
    isMockMode()
      ? (await mock()).updateScreenshots(id, request)
      : apiCall.put<Screenshot[]>(apiRoutes.demos.screenshots(id), request),

  deleteScreenshot: async (id: string, screenshotId: string): Promise<Screenshot[]> =>
    isMockMode()
      ? (await mock()).deleteScreenshot(id, screenshotId)
      : apiCall.delete<Screenshot[]>(apiRoutes.demos.screenshot(id, screenshotId)),
}
