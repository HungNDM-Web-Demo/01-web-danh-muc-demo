import { cache } from 'react'
import { apiRoutes } from '@/config/api-routes'
import { serverFetch } from '@/lib/server-fetch'
import { seedDemos, seedIndustries } from '@/features/demos/mock/demo.data'
import {
  buildPublicDemos,
  buildPublicIndustries,
  buildPublicLookup,
} from '../lib/catalog-projection'
import type { PublicDemoCard, PublicDemoLookup, PublicIndustry } from '../types/catalog.types'

/**
 * Dữ liệu trang công khai lấy phía máy chủ (KIEN-TRUC-HE-THONG §6.3, NFR-04):
 * - api : gọi BE `/api/public/*`, cache 60 giây (NFR-05);
 * - mock: tính từ seed bằng đúng các hàm chiếu của handler mock (catalog-projection.ts).
 * Chỉ dữ liệu công khai đi qua máy chủ Next.js; thông tin nội bộ do trình duyệt tự gọi API có token.
 */

const REVALIDATE = 60

const seedSource = () => ({ industries: seedIndustries(), demos: seedDemos(), slugHistories: [] })

export const getPublicIndustriesServer = cache((): Promise<PublicIndustry[]> =>
  serverFetch<PublicIndustry[]>(apiRoutes.public.industries, {
    mock: () => buildPublicIndustries(seedSource()),
    fallback: [],
    revalidate: REVALIDATE,
  })
)

export const getPublicDemosServer = cache((): Promise<PublicDemoCard[]> =>
  serverFetch<PublicDemoCard[]>(apiRoutes.public.demos, {
    mock: () => buildPublicDemos(seedSource()),
    fallback: [],
    revalidate: REVALIDATE,
  })
)

/** Chi tiết công khai; không có (404) hoặc BE lỗi thì null để trang hiện "Không tìm thấy demo" */
export const getPublicDemoServer = cache((slug: string): Promise<PublicDemoLookup | null> =>
  serverFetch<PublicDemoLookup | null>(apiRoutes.public.demo(slug), {
    mock: () => buildPublicLookup(seedSource(), slug),
    fallback: null,
    revalidate: REVALIDATE,
  })
)
