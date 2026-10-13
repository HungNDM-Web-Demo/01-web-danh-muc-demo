/** Endpoint BE (QUY-UOC-API §3). Đường dẫn tương đối, lib/axios.ts ghép với NEXT_PUBLIC_API_URL. */
export const apiRoutes = {
  auth: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    changePassword: '/api/auth/me/password',
  },
  demo: {
    accounts: '/api/demo/accounts',
    loginAs: '/api/demo/login-as',
    reset: '/api/demo/reset',
  },
  users: {
    list: '/api/users',
    detail: (id: string) => `/api/users/${id}`,
    lock: (id: string) => `/api/users/${id}/lock`,
    resetPassword: (id: string) => `/api/users/${id}/reset-password`,
  },
  roles: {
    list: '/api/roles',
    detail: (id: string) => `/api/roles/${id}`,
    permissions: (id: string) => `/api/roles/${id}/permissions`,
  },
  permissions: {
    list: '/api/permissions',
  },
  settings: {
    public: '/api/settings/public',
    list: '/api/settings',
  },
  uploads: {
    images: '/api/uploads/images',
  },
  auditLogs: {
    list: '/api/audit-logs',
  },

  // ───── Danh mục Demo (07-DANH-SACH-API) ─────
  public: {
    industries: '/api/public/industries',
    demos: '/api/public/demos',
    demo: (slug: string) => `/api/public/demos/${encodeURIComponent(slug)}`,
    visits: (slug: string) => `/api/public/demos/${encodeURIComponent(slug)}/visits`,
  },
  demos: {
    list: '/api/demos',
    summary: '/api/demos/summary',
    nextNumber: '/api/demos/next-number',
    order: '/api/demos/order',
    detail: (id: string) => `/api/demos/${id}`,
    bySlug: (slug: string) => `/api/demos/by-slug/${encodeURIComponent(slug)}`,
    status: (id: string) => `/api/demos/${id}/status`,
    visibility: (id: string) => `/api/demos/${id}/visibility`,
    featured: (id: string) => `/api/demos/${id}/featured`,
    statusHistory: (id: string) => `/api/demos/${id}/status-history`,
    screenshots: (id: string) => `/api/demos/${id}/screenshots`,
    screenshot: (id: string, screenshotId: string) =>
      `/api/demos/${id}/screenshots/${screenshotId}`,
  },
  industries: {
    list: '/api/industries',
    order: '/api/industries/order',
    detail: (id: string) => `/api/industries/${id}`,
  },
  reports: {
    visits: '/api/reports/visits',
  },
} as const
