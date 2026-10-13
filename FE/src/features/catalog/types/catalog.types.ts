import type { DemoDevStatus } from '@/features/demos/types/demo.types'

/**
 * DTO API công khai `/api/public/*`, khớp 07-DANH-SACH-API §2.
 * Không bao giờ có demoPassword, internalNotes, demoScript, faqs, swaggerUrl, repoUrl, ownerName (BR-10).
 */

/** GET /api/public/industries: nhóm có ít nhất 1 demo hiển thị (BR-13) */
export type PublicIndustry = {
  slug: string
  name: string
  icon?: string | null
  color: string
  sortOrder: number
  /** Số demo hiển thị, gồm Sắp ra mắt */
  count: number
}

/** GET /api/public/demos: demo hiển thị, đúng thứ tự BR-04 */
export type PublicDemoCard = {
  slug: string
  name: string
  industry: { slug: string; name: string; color: string; icon?: string | null }
  shortDescription?: string | null
  /** null → FE vẽ ảnh mặc định theo màu nhóm ngành (BR-07) */
  coverUrl?: string | null
  /** Chỉ DangLam | DemoDuoc | HoanThien */
  devStatus: DemoDevStatus
  /** devStatus = DangLam */
  isComingSoon: boolean
  /** null khi Sắp ra mắt */
  demoUrl?: string | null
  isFeatured: boolean
  sortOrder: number
  /** Để FE tìm kiếm (BR-03) */
  features: string[]
  keywords: string[]
}

export type PublicScreenshot = {
  url: string
  caption?: string | null
  width: number
  height: number
  isCover: boolean
}

export type PublicDemoAccount = { username: string; roleName: string; purpose?: string | null }

export type PublicDemoDetail = PublicDemoCard & {
  targetCustomers?: string | null
  problemSolved?: string | null
  description?: string | null
  productType?: string | null
  devices?: string | null
  requiresLogin: boolean
  accounts: PublicDemoAccount[]
  screenshots: PublicScreenshot[]
  /** Tối đa 3 demo công khai cùng nhóm, thứ tự BR-04 (FR-09) */
  related: PublicDemoCard[]
  updatedAt: string
}

/** GET /api/public/demos/{slug}: slug cũ trả redirectSlug; không có hoặc không hiển thị → 404 */
export type PublicDemoLookup = { demo?: PublicDemoDetail | null; redirectSlug?: string | null }

/** POST /api/public/demos/{slug}/visits (BR-14) */
export type RecordVisitRequest = {
  type: 'View' | 'Open'
  /** Mã ngẫu nhiên lưu ở localStorage, 16–64 ký tự */
  visitorId: string
  device: 'Mobile' | 'Desktop'
  referrer?: string | null
}

export type RecordVisitResponse = { counted: boolean }
