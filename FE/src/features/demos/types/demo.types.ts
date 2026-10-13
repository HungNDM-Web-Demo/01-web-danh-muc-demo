/**
 * DTO quản lý demo, khớp từng trường với 07-DANH-SACH-API §3 (BE Application/DTOs/Cms).
 * Trường có `?` là có thể vắng hoặc null (QUY-UOC-API §4).
 */

/** Enum DemoDevStatus (06-THIET-KE-CSDL): chuỗi PascalCase không dấu */
export type DemoDevStatus = 'MoiTao' | 'DangLam' | 'DemoDuoc' | 'HoanThien'

/** GET /api/demos → DemoListItem[] (thứ tự sortOrder; lọc, tìm ở FE) */
export type DemoListItem = {
  id: string
  number: number
  /** "02-fnb-pos-cafe" */
  folder: string
  projectCode: string
  name: string
  slug: string
  industry: { id: string; slug: string; name: string; color: string }
  devStatus: DemoDevStatus
  isVisible: boolean
  isFeatured: boolean
  sortOrder: number
  coverUrl?: string | null
  screenshotCount: number
  /** Chỉ khi có demos.view-internal */
  ownerName?: string | null
  /** firstPublishedAt != null */
  everPublished: boolean
  updatedAt: string
}

/** GET /api/demos/summary */
export type DemoSummary = {
  total: number
  moiTao: number
  dangLam: number
  demoDuoc: number
  hoanThien: number
  /** Gồm Sắp ra mắt */
  visible: number
  featured: number
  featuredMax: 6
}

export type Screenshot = {
  id: string
  url: string
  caption?: string | null
  width: number
  height: number
  sizeBytes: number
  sortOrder: number
  isCover: boolean
}

export type DemoAccountItem = { username: string; roleName: string; purpose?: string | null }
export type DemoFaqItem = { question: string; answer: string }

export type DemoInternal = {
  swaggerUrl?: string | null
  repoUrl?: string | null
  ownerName?: string | null
  demoPassword?: string | null
  internalNotes?: string | null
  demoScript?: string | null
  faqs: DemoFaqItem[]
}

/** GET /api/demos/{id}, GET /api/demos/by-slug/{slug} */
export type DemoDetail = {
  id: string
  number: number
  projectCode: string
  folder: string
  name: string
  slug: string
  oldSlugs: string[]
  industryId: string
  ideaCode?: string | null
  targetCustomers?: string | null
  problemSolved?: string | null
  productType?: string | null
  devices?: string | null
  shortDescription?: string | null
  description?: string | null
  features: string[]
  keywords: string[]
  demoUrl?: string | null
  requiresLogin: boolean
  accounts: DemoAccountItem[]
  screenshots: Screenshot[]
  devStatus: DemoDevStatus
  isVisible: boolean
  isFeatured: boolean
  sortOrder: number
  firstPublishedAt?: string | null
  updatedAt: string
  /** Kiểm tra BR-01, BR-02 cho trạng thái hiện tại */
  visibilityCheck: { canShow: boolean; missing: string[] }
  /** Chỉ có khi người gọi có demos.view-internal (BR-10) */
  internal?: DemoInternal | null
}

/** POST /api/demos, PUT /api/demos/{id} */
export type SaveDemoRequest = {
  number: number
  /** Chỉ dùng khi thêm mới; sửa thì bỏ qua (BR-09) */
  projectCode: string
  name: string
  slug: string
  industryId: string
  ideaCode?: string | null
  targetCustomers?: string | null
  problemSolved?: string | null
  productType?: string | null
  devices?: string | null
  shortDescription?: string | null
  description?: string | null
  features: string[]
  keywords: string[]
  demoUrl?: string | null
  swaggerUrl?: string | null
  repoUrl?: string | null
  ownerName?: string | null
  requiresLogin: boolean
  demoPassword?: string | null
  internalNotes?: string | null
  demoScript?: string | null
  /** Thứ tự mảng = thứ tự hiển thị */
  accounts: DemoAccountItem[]
  faqs: DemoFaqItem[]
}

export type ChangeStatusRequest = { status: DemoDevStatus; reason?: string | null }
export type SetVisibilityRequest = { isVisible: boolean }
export type SetFeaturedRequest = { isFeatured: boolean }
/** Toàn bộ demo theo thứ tự mới */
export type ReorderDemosRequest = { ids: string[] }

export type StatusHistoryItem = {
  fromStatus?: DemoDevStatus | null
  toStatus: DemoDevStatus
  reason?: string | null
  changedByName: string
  changedAt: string
}

export type UploadScreenshotsResult = {
  accepted: Screenshot[]
  /** Lý do theo TC-28, TC-29 */
  rejected: { fileName: string; reason: string }[]
}

export type UpdateScreenshotsRequest = {
  items: { id: string; caption?: string | null; sortOrder: number; isCover: boolean }[]
}

/** Tên hiển thị trạng thái phát triển */
export const devStatusLabels: Record<DemoDevStatus, string> = {
  MoiTao: 'Mới tạo',
  DangLam: 'Đang làm',
  DemoDuoc: 'Demo được',
  HoanThien: 'Hoàn thiện',
}

/** Thứ tự trạng thái BR-11: Mới tạo → Đang làm → Demo được → Hoàn thiện */
export const devStatusOrder: DemoDevStatus[] = ['MoiTao', 'DangLam', 'DemoDuoc', 'HoanThien']
