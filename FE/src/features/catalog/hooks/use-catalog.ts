'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { isApiError } from '@/lib/api-error'
import { PUBLIC_QUERY_ROOT } from '@/lib/query-client'
import { catalogService } from '../services/catalog.service'
import type {
  PublicDemoCard,
  PublicDemoLookup,
  PublicIndustry,
  RecordVisitRequest,
} from '../types/catalog.types'

/** Khóa query công khai (bắt đầu bằng 'public': không làm mới khi đổi người đăng nhập) */
export const catalogKeys = {
  all: [PUBLIC_QUERY_ROOT, 'catalog'] as const,
  industries: [PUBLIC_QUERY_ROOT, 'catalog', 'industries'] as const,
  demos: [PUBLIC_QUERY_ROOT, 'catalog', 'demos'] as const,
  demo: (slug: string) => [PUBLIC_QUERY_ROOT, 'catalog', 'demo', slug] as const,
}

/**
 * Trang công khai render sẵn phía máy chủ rồi truyền dữ liệu vào `initialData`;
 * `initialDataUpdatedAt: 0` để trình duyệt đọc lại ngay (mock-db hoặc API) sau khi hydrate.
 */
const hydrateOptions = <T>(initialData: T | undefined) =>
  initialData === undefined ? {} : { initialData, initialDataUpdatedAt: 0 }

export function usePublicIndustries(initialData?: PublicIndustry[]) {
  return useQuery({
    queryKey: catalogKeys.industries,
    queryFn: () => catalogService.getIndustries(),
    ...hydrateOptions(initialData),
  })
}

export function usePublicDemos(initialData?: PublicDemoCard[]) {
  return useQuery({
    queryKey: catalogKeys.demos,
    queryFn: () => catalogService.getDemos(),
    ...hydrateOptions(initialData),
  })
}

/** Chi tiết công khai; 404 trả về `{}` để giao diện hiện "Không tìm thấy demo" thay vì lỗi */
export function usePublicDemo(slug: string, initialData?: PublicDemoLookup | null) {
  return useQuery({
    queryKey: catalogKeys.demo(slug),
    queryFn: async (): Promise<PublicDemoLookup> => {
      try {
        return await catalogService.getDemo(slug)
      } catch (error) {
        if (isApiError(error) && error.status === 404) return {}
        throw error
      }
    },
    ...hydrateOptions(initialData ?? undefined),
  })
}

/** FR-27: ghi lượt xem, lượt mở demo (bỏ qua lỗi, không làm phiền khách) */
export function useRecordVisit() {
  return useMutation({
    mutationFn: ({ slug, request }: { slug: string; request: RecordVisitRequest }) =>
      catalogService.recordVisit(slug, request).catch(() => ({ counted: false })),
  })
}
