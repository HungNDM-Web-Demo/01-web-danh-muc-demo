/**
 * Mã quyền, khai báo giống hệt BE `Application/Constants/Permissions.cs`
 * và danh sách seed `src/mock/seed/system.json` (+ project.json).
 * Định dạng `{resource}.{action}`. Không gõ chuỗi mã quyền trực tiếp trong component.
 */
export const permissions = {
  dashboard: {
    view: 'dashboard.view',
  },
  users: {
    view: 'users.view',
    create: 'users.create',
    update: 'users.update',
    delete: 'users.delete',
  },
  roles: {
    view: 'roles.view',
    create: 'roles.create',
    update: 'roles.update',
    delete: 'roles.delete',
  },
  settings: {
    view: 'settings.view',
    update: 'settings.update',
  },
  auditLogs: {
    view: 'audit-logs.view',
  },
  // ───── Quyền nghiệp vụ Danh mục Demo (02-SRS §7, 07-DANH-SACH-API §1) ─────
  demos: {
    view: 'demos.view',
    /** Xem thông tin nội bộ, xem trước demo chưa công khai (FR-12, FR-13, BR-10) */
    viewInternal: 'demos.view-internal',
    create: 'demos.create',
    update: 'demos.update',
    /** Đổi trạng thái, bật/tắt hiển thị, nổi bật, sắp xếp (FR-21 → FR-23) */
    publish: 'demos.publish',
    /** Xóa demo chưa từng công khai (FR-24, BR-12) */
    delete: 'demos.delete',
    /** Sao chép gửi khách, sao chép link danh mục (FR-14, FR-15) */
    share: 'demos.share',
  },
  industries: {
    view: 'industries.view',
    create: 'industries.create',
    update: 'industries.update',
    delete: 'industries.delete',
  },
  reports: {
    view: 'reports.view',
  },
} as const

/** Mã vai trò hệ thống (BR-SYS-06). */
export const roleCodes = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  staff: 'STAFF',
} as const

type Leaves<T> = T extends string ? T : { [K in keyof T]: Leaves<T[K]> }[keyof T]
export type PermissionCode = Leaves<typeof permissions>
