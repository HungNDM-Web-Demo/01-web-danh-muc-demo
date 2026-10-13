/** DTO nhóm ngành, khớp 07-DANH-SACH-API §4. */

/** GET /api/industries → Industry[] (theo sortOrder) */
export type Industry = {
  id: string
  code: number
  name: string
  slug: string
  /** Tên icon lucide, vd "UtensilsCrossed" */
  icon?: string | null
  /** Mã màu nhãn và ảnh mặc định, vd "#EA580C" */
  color: string
  description?: string | null
  sortOrder: number
  demoCount: number
  visibleDemoCount: number
}

/** POST /api/industries, PUT /api/industries/{id} */
export type SaveIndustryRequest = {
  code: number
  name: string
  slug: string
  icon?: string | null
  color: string
  description?: string | null
}

/** PUT /api/industries/order */
export type ReorderIndustriesRequest = { ids: string[] }
