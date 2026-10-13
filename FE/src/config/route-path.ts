/** Đường dẫn FE (kebab-case). Không gõ đường dẫn trực tiếp trong component. */
export const routePath = {
  root: '/',
  login: '/login',
  forbidden: '/forbidden',
  profile: '/profile',

  dashboard: '/dashboard',

  settingsUsers: '/settings/users',
  settingsRoles: '/settings/roles',
  settingsGeneral: '/settings/general',
  settingsAuditLogs: '/settings/audit-logs',

  // ───── Danh mục Demo ─────
  /** Trang danh mục công khai (SCR-01) */
  catalog: '/',
  /** Quản lý demo (SCR-05), trang mở sau khi đăng nhập */
  adminDemos: '/admin/demos',
  adminDemoNew: '/admin/demos/new',
  /** Nhóm ngành (SCR-07) */
  adminCategories: '/admin/categories',
  /** Thống kê lượt xem (SCR-08) */
  adminReports: '/admin/reports',
} as const

/** Đường dẫn có tham số. */
export const routeTo = {
  /** Trang chi tiết công khai (SCR-02) */
  demoDetail: (slug: string) => `/demos/${encodeURIComponent(slug)}`,
  /** Sửa demo (SCR-06) */
  adminDemoEdit: (id: string) => `/admin/demos/${id}`,
} as const

export type RoutePath = (typeof routePath)[keyof typeof routePath]
