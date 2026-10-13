import { permissions } from '@/config/permissions'
import { mockDelay } from '@/lib/data-source'
import { USERNAME_MESSAGE, USERNAME_PATTERN } from '@/lib/validators'
import { auditCreate, auditDelete, auditUpdate } from '@/mock/mock-audit'
import { requirePermission, type MockSessionContext } from '@/mock/mock-auth'
import { mockBlobs, readImageSize } from '@/mock/mock-blobs'
import { mockDb } from '@/mock/mock-db'
import { conflict, domain, notFound, validation } from '@/mock/mock-errors'
import { newId } from '@/mock/mock-helpers'
import { coverOf } from '@/features/catalog/lib/catalog-projection'
import {
  PROJECT_CODE_MESSAGE,
  PROJECT_CODE_PATTERN,
  SCREENSHOT_TYPES,
  SLUG_MESSAGE,
  SLUG_PATTERN,
  URL_MESSAGE,
  compareSortOrder,
  demoErrors,
  demoFolder,
  demoLimits,
  isBackward,
  isPublicDemo,
  isRunnableStatus,
  isValidHttpUrl,
  screenshotMessages,
  visibilityMissing,
} from '../lib/demo-rules'
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
import {
  demosDb,
  industriesDb,
  slugHistoriesDb,
  statusHistoriesDb,
  visitStatsDb,
  visitsDb,
} from './demo.db'
import type { DemoRecord } from './demo.data'

/**
 * Handler `/api/demos/*` ở chế độ mock (07-DANH-SACH-API §3): áp BR-01 → BR-18 và trả lỗi
 * đúng chữ như BE. Trường nội bộ chỉ trả khi người gọi có demos.view-internal (BR-10).
 */

const ENTITY = 'Demo'

const can = (context: MockSessionContext, code: string) =>
  context.isSuperAdmin || context.permissions.includes(code)

const nowIso = () => new Date().toISOString()

const blankToNull = (value: string | null | undefined) => {
  const text = value?.trim()
  return text ? text : null
}

/** Bản ghi để ghi nhật ký: bỏ mật khẩu demo, thay mảng ảnh bằng số ảnh */
function auditView(record: DemoRecord) {
  const { demoPassword, screenshots, ...rest } = record
  return {
    ...rest,
    demoPassword: demoPassword ? '••••••' : null,
    screenshotCount: screenshots.length,
  }
}

function getDemoOr404(id: string): DemoRecord {
  const demo = demosDb.get(id)
  if (!demo) throw notFound('Không tìm thấy demo')
  return demo
}

const visibilityInput = (demo: DemoRecord) => ({
  devStatus: demo.devStatus,
  shortDescription: demo.shortDescription,
  features: demo.features,
  screenshotCount: demo.screenshots.length,
  demoUrl: demo.demoUrl,
  requiresLogin: demo.requiresLogin,
  accountCount: demo.accounts.length,
})

function toListItem(demo: DemoRecord, withInternal: boolean): DemoListItem {
  const industry = industriesDb.get(demo.industryId)
  return {
    id: demo.id,
    number: demo.number,
    folder: demoFolder(demo.number, demo.projectCode),
    projectCode: demo.projectCode,
    name: demo.name,
    slug: demo.slug,
    industry: {
      id: demo.industryId,
      slug: industry?.slug ?? '',
      name: industry?.name ?? 'Chưa phân nhóm',
      color: industry?.color ?? '#475569',
    },
    devStatus: demo.devStatus,
    isVisible: demo.isVisible,
    isFeatured: demo.isFeatured,
    sortOrder: demo.sortOrder,
    coverUrl: coverOf(demo),
    screenshotCount: demo.screenshots.length,
    ownerName: withInternal ? demo.ownerName : null,
    everPublished: !!demo.firstPublishedAt,
    updatedAt: demo.updatedAt,
  }
}

function toDetail(demo: DemoRecord, withInternal: boolean): DemoDetail {
  const missing = visibilityMissing(visibilityInput(demo))
  return {
    id: demo.id,
    number: demo.number,
    projectCode: demo.projectCode,
    folder: demoFolder(demo.number, demo.projectCode),
    name: demo.name,
    slug: demo.slug,
    oldSlugs: slugHistoriesDb.filter((h) => h.demoId === demo.id).map((h) => h.slug),
    industryId: demo.industryId,
    ideaCode: demo.ideaCode,
    targetCustomers: demo.targetCustomers,
    problemSolved: demo.problemSolved,
    productType: demo.productType,
    devices: demo.devices,
    shortDescription: demo.shortDescription,
    description: demo.description,
    features: [...demo.features],
    keywords: [...demo.keywords],
    demoUrl: demo.demoUrl,
    requiresLogin: demo.requiresLogin,
    accounts: demo.accounts.map((a) => ({ ...a })),
    screenshots: [...demo.screenshots].sort((a, b) => a.sortOrder - b.sortOrder),
    devStatus: demo.devStatus,
    isVisible: demo.isVisible,
    isFeatured: demo.isFeatured,
    sortOrder: demo.sortOrder,
    firstPublishedAt: demo.firstPublishedAt,
    updatedAt: demo.updatedAt,
    visibilityCheck: { canShow: missing.length === 0, missing },
    internal: withInternal
      ? {
          swaggerUrl: demo.swaggerUrl,
          repoUrl: demo.repoUrl,
          ownerName: demo.ownerName,
          demoPassword: demo.demoPassword,
          internalNotes: demo.internalNotes,
          demoScript: demo.demoScript,
          faqs: demo.faqs.map((f) => ({ ...f })),
        }
      : null,
  }
}

// ───────────────────────── Kiểm tra dữ liệu (BR-05, BR-06, BR-08, BR-09, BR-16) ─────────────────────────

type FieldErrors = Record<string, string>

function checkText(
  errors: FieldErrors,
  key: string,
  value: string | null | undefined,
  max: number,
  label: string
) {
  if (value && value.trim().length > max) errors[key] = `${label} tối đa ${max} ký tự`
}

function validateSave(request: SaveDemoRequest, current: DemoRecord | null) {
  const errors: FieldErrors = {}
  /** Trùng mã dự án, slug (kể cả slug cũ), số thứ tự → 409 kèm errors.{field} như BE */
  const duplicates: FieldErrors = {}
  const others = demosDb.filter((d) => d.id !== current?.id)

  if (!Number.isInteger(request.number) || request.number < 1 || request.number > 99) {
    errors.number = 'Số thứ tự là số nguyên từ 1 đến 99'
  } else if (others.some((d) => d.number === request.number)) {
    duplicates.number = `Số thứ tự ${String(request.number).padStart(2, '0')} đã được dùng`
  }

  if (!current) {
    const code = request.projectCode?.trim() ?? ''
    if (!PROJECT_CODE_PATTERN.test(code)) errors.projectCode = PROJECT_CODE_MESSAGE
    else if (others.some((d) => d.projectCode === code))
      duplicates.projectCode = 'Mã dự án đã tồn tại'
  }

  const name = request.name?.trim() ?? ''
  if (!name) errors.name = 'Nhập tên demo'
  else if (name.length > demoLimits.nameMax) errors.name = `Tên tối đa ${demoLimits.nameMax} ký tự`

  const slug = request.slug?.trim() ?? ''
  if (!SLUG_PATTERN.test(slug)) errors.slug = SLUG_MESSAGE
  else if (
    others.some((d) => d.slug === slug) ||
    slugHistoriesDb.some((h) => h.slug === slug && h.demoId !== current?.id)
  ) {
    duplicates.slug = 'Slug đã được dùng cho demo khác'
  }

  if (!industriesDb.get(request.industryId)) errors.industryId = 'Chọn nhóm ngành'

  const short = request.shortDescription?.trim() ?? ''
  if (
    short &&
    (short.length < demoLimits.shortDescriptionMin || short.length > demoLimits.shortDescriptionMax)
  ) {
    errors.shortDescription = `Mô tả ngắn cần dài ${demoLimits.shortDescriptionMin}–${demoLimits.shortDescriptionMax} ký tự (hiện có ${short.length})`
  }

  const features = request.features ?? []
  if (features.length > demoLimits.featuresMax)
    errors.features = `Tối đa ${demoLimits.featuresMax} tính năng nổi bật`
  else if (features.some((f) => !f.trim())) errors.features = 'Tính năng không được để trống'
  else if (features.some((f) => f.trim().length > demoLimits.featureMax)) {
    errors.features = `Mỗi tính năng tối đa ${demoLimits.featureMax} ký tự`
  }

  if ((request.keywords ?? []).length > demoLimits.keywordsMax)
    errors.keywords = `Tối đa ${demoLimits.keywordsMax} từ khóa`

  for (const key of ['demoUrl', 'swaggerUrl', 'repoUrl'] as const) {
    const value = request[key]?.trim()
    if (value && !isValidHttpUrl(value)) errors[key] = URL_MESSAGE
  }

  checkText(errors, 'ideaCode', request.ideaCode, 10, 'Mã ý tưởng')
  checkText(errors, 'targetCustomers', request.targetCustomers, 300, 'Đối tượng khách hàng')
  checkText(errors, 'problemSolved', request.problemSolved, 1000, 'Vấn đề giải quyết')
  checkText(errors, 'productType', request.productType, 150, 'Loại sản phẩm')
  checkText(errors, 'devices', request.devices, 150, 'Thiết bị')
  checkText(errors, 'ownerName', request.ownerName, 100, 'Người phụ trách')
  checkText(errors, 'demoPassword', request.demoPassword, 100, 'Mật khẩu demo')
  checkText(
    errors,
    'internalNotes',
    request.internalNotes,
    demoLimits.internalNotesMax,
    'Ghi chú nội bộ'
  )

  const accounts = request.accounts ?? []
  if (accounts.length > demoLimits.accountsMax)
    errors.accounts = `Mỗi demo tối đa ${demoLimits.accountsMax} tài khoản demo`
  const seen = new Set<string>()
  accounts.forEach((account, index) => {
    const username = account.username?.trim() ?? ''
    if (!USERNAME_PATTERN.test(username)) errors[`accounts[${index}].username`] = USERNAME_MESSAGE
    else if (seen.has(username))
      errors[`accounts[${index}].username`] = 'Tên đăng nhập bị trùng trong demo này'
    seen.add(username)
    if (!account.roleName?.trim()) errors[`accounts[${index}].roleName`] = 'Nhập tên vai trò'
  })

  ;(request.faqs ?? []).forEach((faq, index) => {
    if (!faq.question?.trim()) errors[`faqs[${index}].question`] = 'Nhập câu hỏi'
    if (!faq.answer?.trim()) errors[`faqs[${index}].answer`] = 'Nhập câu trả lời gợi ý'
  })

  if (Object.keys(errors).length) throw validation(errors)
  const firstDuplicate = Object.values(duplicates)[0]
  if (firstDuplicate) throw conflict(`${firstDuplicate}.`, duplicates)
}

/** Ghép dữ liệu form vào bản ghi */
function applySave(base: DemoRecord, request: SaveDemoRequest): DemoRecord {
  return {
    ...base,
    number: request.number,
    name: request.name.trim(),
    slug: request.slug.trim(),
    industryId: request.industryId,
    ideaCode: blankToNull(request.ideaCode),
    targetCustomers: blankToNull(request.targetCustomers),
    problemSolved: blankToNull(request.problemSolved),
    productType: blankToNull(request.productType),
    devices: blankToNull(request.devices),
    shortDescription: blankToNull(request.shortDescription),
    description: blankToNull(request.description),
    features: request.features.map((f) => f.trim()).filter(Boolean),
    keywords: [...new Set(request.keywords.map((k) => k.trim()).filter(Boolean))],
    demoUrl: blankToNull(request.demoUrl),
    swaggerUrl: blankToNull(request.swaggerUrl),
    repoUrl: blankToNull(request.repoUrl),
    ownerName: blankToNull(request.ownerName),
    requiresLogin: request.requiresLogin,
    demoPassword: blankToNull(request.demoPassword),
    internalNotes: blankToNull(request.internalNotes),
    demoScript: blankToNull(request.demoScript),
    accounts: request.accounts.map((a) => ({
      username: a.username.trim(),
      roleName: a.roleName.trim(),
      purpose: blankToNull(a.purpose),
    })),
    faqs: request.faqs.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })),
    updatedAt: nowIso(),
  }
}

/** Đánh lại thứ tự ảnh 1, 2, 3… và đảm bảo đúng 1 ảnh đại diện khi có ảnh (BR-07) */
function normalizeScreenshots(list: Screenshot[]): Screenshot[] {
  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder)
  const coverId = (sorted.find((s) => s.isCover) ?? sorted[0])?.id
  return sorted.map((s, index) => ({ ...s, sortOrder: index + 1, isCover: s.id === coverId }))
}

export const demoMock = {
  async list(): Promise<DemoListItem[]> {
    await mockDelay()
    const context = requirePermission(permissions.demos.view)
    const withInternal = can(context, permissions.demos.viewInternal)
    return demosDb
      .all()
      .sort(compareSortOrder)
      .map((d) => toListItem(d, withInternal))
  },

  async summary(): Promise<DemoSummary> {
    await mockDelay(150, 300)
    requirePermission(permissions.demos.view)
    const demos = demosDb.all()
    return {
      total: demos.length,
      moiTao: demos.filter((d) => d.devStatus === 'MoiTao').length,
      dangLam: demos.filter((d) => d.devStatus === 'DangLam').length,
      demoDuoc: demos.filter((d) => d.devStatus === 'DemoDuoc').length,
      hoanThien: demos.filter((d) => d.devStatus === 'HoanThien').length,
      visible: demos.filter((d) => d.isVisible && d.devStatus !== 'MoiTao').length,
      featured: demos.filter((d) => d.isFeatured).length,
      featuredMax: 6,
    }
  },

  async nextNumber(): Promise<{ number: number }> {
    await mockDelay(100, 200)
    requirePermission(permissions.demos.create)
    const max = demosDb.all().reduce((acc, d) => Math.max(acc, d.number), 0)
    return { number: Math.min(max + 1, 99) }
  },

  async get(id: string): Promise<DemoDetail> {
    await mockDelay()
    const context = requirePermission(permissions.demos.view)
    return toDetail(getDemoOr404(id), can(context, permissions.demos.viewInternal))
  },

  /** Trang chi tiết: khung nội bộ, xem trước demo chưa công khai (FR-12, FR-13). Nhận cả slug cũ. */
  async getBySlug(slug: string): Promise<DemoDetail> {
    await mockDelay(120, 250)
    requirePermission(permissions.demos.viewInternal)
    const key = slug.trim().toLowerCase()
    const demo =
      demosDb.find((d) => d.slug === key) ??
      demosDb.get(slugHistoriesDb.find((h) => h.slug === key)?.demoId ?? '')
    if (!demo) throw notFound('Không tìm thấy demo')
    return toDetail(demo, true)
  },

  /** Thêm demo: trạng thái Mới tạo, ẩn (UC-05) */
  async create(request: SaveDemoRequest): Promise<DemoDetail> {
    await mockDelay()
    const context = requirePermission(permissions.demos.create)
    validateSave(request, null)
    const now = nowIso()
    const base: DemoRecord = {
      id: newId(),
      number: request.number,
      projectCode: request.projectCode.trim(),
      name: '',
      slug: '',
      industryId: request.industryId,
      ideaCode: null,
      targetCustomers: null,
      problemSolved: null,
      productType: null,
      devices: null,
      shortDescription: null,
      description: null,
      features: [],
      keywords: [],
      demoUrl: null,
      swaggerUrl: null,
      repoUrl: null,
      ownerName: null,
      requiresLogin: true,
      demoPassword: null,
      internalNotes: null,
      demoScript: null,
      devStatus: 'MoiTao',
      isVisible: false,
      isFeatured: false,
      sortOrder: Math.min(request.number * 10, demoLimits.sortOrderMax),
      firstPublishedAt: null,
      createdAt: now,
      updatedAt: now,
      accounts: [],
      faqs: [],
      screenshots: [],
    }
    const record = applySave(base, request)
    mockDb.batch(() => {
      demosDb.insert(record)
      statusHistoriesDb.insert({
        id: newId(),
        demoId: record.id,
        fromStatus: null,
        toStatus: 'MoiTao',
        reason: null,
        changedByName: context.user.username,
        changedAt: now,
      })
    })
    auditCreate(ENTITY, auditView(record))
    return toDetail(record, true)
  },

  /** Sửa thông tin, tài khoản, câu hỏi, nội bộ (BR-02, BR-05, BR-06, BR-08) */
  async update(id: string, request: SaveDemoRequest): Promise<DemoDetail> {
    await mockDelay()
    const context = requirePermission(permissions.demos.update)
    const current = getDemoOr404(id)
    validateSave(request, current)
    let next = applySave(current, request)
    // Người không có quyền xem nội bộ không thấy các trường nội bộ trên form, nên không được ghi đè chúng (BR-10)
    if (!can(context, permissions.demos.viewInternal)) {
      const { swaggerUrl, repoUrl, ownerName, demoPassword, internalNotes, demoScript, faqs } =
        current
      next = {
        ...next,
        swaggerUrl,
        repoUrl,
        ownerName,
        demoPassword,
        internalNotes,
        demoScript,
        faqs,
      }
    }

    // BR-02: demo đang hiển thị không được sửa làm mất điều kiện
    if (next.isVisible) {
      const missing = visibilityMissing(visibilityInput(next))
      if (missing.length) throw domain(demoErrors.visibleLocked, { missing })
    }

    mockDb.batch(() => {
      if (next.slug !== current.slug) {
        // BR-06: demo đã từng công khai thì giữ slug cũ để chuyển hướng 301
        slugHistoriesDb.removeWhere((h) => h.demoId === id && h.slug === next.slug)
        if (current.firstPublishedAt && !slugHistoriesDb.some((h) => h.slug === current.slug)) {
          slugHistoriesDb.insert({
            id: newId(),
            demoId: id,
            slug: current.slug,
            changedAt: nowIso(),
          })
        }
      }
      demosDb.update(id, next)
    })
    auditUpdate(ENTITY, auditView(current), auditView(next))
    return toDetail(next, can(context, permissions.demos.viewInternal))
  },

  /** BR-12: chỉ Quản trị viên, chỉ demo chưa từng công khai */
  async remove(id: string): Promise<void> {
    await mockDelay()
    requirePermission(permissions.demos.delete)
    const demo = getDemoOr404(id)
    if (demo.firstPublishedAt) throw domain(demoErrors.everPublished)
    mockDb.batch(() => {
      demosDb.remove(id)
      slugHistoriesDb.removeWhere((h) => h.demoId === id)
      statusHistoriesDb.removeWhere((h) => h.demoId === id)
      visitsDb.removeWhere((v) => v.demoId === id)
      visitStatsDb.removeWhere((v) => v.demoId === id)
    })
    for (const shot of demo.screenshots) {
      if (mockBlobs.isIdbUrl(shot.url)) await mockBlobs.remove(shot.url).catch(() => undefined)
    }
    auditDelete(ENTITY, auditView(demo))
  },

  /** BR-11: tiến lên nhảy bậc không cần lý do; lùi bậc cần lý do 10–500 ký tự */
  async changeStatus(id: string, request: ChangeStatusRequest): Promise<DemoDetail> {
    await mockDelay()
    const context = requirePermission(permissions.demos.publish)
    const current = getDemoOr404(id)
    const to = request.status
    if (!['MoiTao', 'DangLam', 'DemoDuoc', 'HoanThien'].includes(to)) {
      throw validation({ status: 'Trạng thái không hợp lệ' })
    }
    if (to === current.devStatus)
      return toDetail(current, can(context, permissions.demos.viewInternal))

    const backward = isBackward(current.devStatus, to)
    const reason = request.reason?.trim() ?? ''
    if (
      backward &&
      (reason.length < demoLimits.reasonMin || reason.length > demoLimits.reasonMax)
    ) {
      throw validation(
        {
          reason: `Lùi bậc trạng thái cần lý do ${demoLimits.reasonMin}–${demoLimits.reasonMax} ký tự`,
        },
        'Nhập lý do lùi bậc trạng thái.'
      )
    }

    const next: DemoRecord = { ...current, devStatus: to, updatedAt: nowIso() }
    if (to === 'DangLam' || to === 'MoiTao') next.isFeatured = false
    if (to === 'MoiTao') next.isVisible = false

    // BR-02: demo đang hiển thị lên Demo được/Hoàn thiện phải đủ điều kiện
    if (next.isVisible) {
      const missing = visibilityMissing(visibilityInput(next))
      if (missing.length) throw domain(demoErrors.notEligible, { missing })
    }
    if (next.isVisible && isRunnableStatus(to) && !next.firstPublishedAt)
      next.firstPublishedAt = nowIso()

    mockDb.batch(() => {
      demosDb.update(id, next)
      statusHistoriesDb.insert({
        id: newId(),
        demoId: id,
        fromStatus: current.devStatus,
        toStatus: to,
        reason: reason || null,
        changedByName: context.user.username,
        changedAt: nowIso(),
      })
    })
    auditUpdate(ENTITY, auditView(current), auditView(next))
    return toDetail(next, can(context, permissions.demos.viewInternal))
  },

  /** BR-01, BR-02: bật hiển thị cần đủ điều kiện; tắt hiển thị thì bỏ nổi bật */
  async setVisibility(id: string, request: SetVisibilityRequest): Promise<DemoDetail> {
    await mockDelay()
    const context = requirePermission(permissions.demos.publish)
    const current = getDemoOr404(id)
    const next: DemoRecord = { ...current, isVisible: !!request.isVisible, updatedAt: nowIso() }
    if (request.isVisible) {
      if (current.devStatus === 'MoiTao') {
        throw domain(demoErrors.newCannotShow, { missing: [demoErrors.newCannotShow] })
      }
      const missing = visibilityMissing(visibilityInput(next))
      if (missing.length) throw domain(demoErrors.notEligible, { missing })
      if (isRunnableStatus(next.devStatus) && !next.firstPublishedAt)
        next.firstPublishedAt = nowIso()
    } else {
      next.isFeatured = false
    }
    demosDb.update(id, next)
    auditUpdate(ENTITY, auditView(current), auditView(next))
    return toDetail(next, can(context, permissions.demos.viewInternal))
  },

  /** BR-04: tối đa 6 demo nổi bật, chỉ demo công khai */
  async setFeatured(id: string, request: SetFeaturedRequest): Promise<DemoDetail> {
    await mockDelay(150, 300)
    const context = requirePermission(permissions.demos.publish)
    const current = getDemoOr404(id)
    if (request.isFeatured) {
      if (!isPublicDemo(current)) throw domain(demoErrors.featuredNotPublic)
      const count = demosDb.count((d) => d.id !== id && d.isFeatured)
      if (count >= demoLimits.featuredMax) throw domain(demoErrors.featuredMax)
    }
    const next: DemoRecord = { ...current, isFeatured: !!request.isFeatured, updatedAt: nowIso() }
    demosDb.update(id, next)
    auditUpdate(ENTITY, auditView(current), auditView(next))
    return toDetail(next, can(context, permissions.demos.viewInternal))
  },

  /** BR-18: đánh lại thứ tự toàn bộ danh sách thành 10, 20, 30… */
  async reorder(request: ReorderDemosRequest): Promise<void> {
    await mockDelay()
    requirePermission(permissions.demos.publish)
    const all = demosDb.all()
    const ids = request.ids ?? []
    const unique = new Set(ids)
    if (
      unique.size !== ids.length ||
      ids.length !== all.length ||
      !all.every((d) => unique.has(d.id))
    ) {
      throw validation(
        { ids: 'Danh sách sắp xếp phải gồm đủ mọi demo' },
        'Danh sách đã thay đổi, tải lại trang rồi thử lại.'
      )
    }
    mockDb.batch(() => {
      ids.forEach((id, index) => {
        const sortOrder = Math.min((index + 1) * 10, demoLimits.sortOrderMax)
        demosDb.update(id, (d) => (d.sortOrder === sortOrder ? d : { ...d, sortOrder }))
      })
    })
  },

  async statusHistory(id: string): Promise<StatusHistoryItem[]> {
    await mockDelay(150, 300)
    requirePermission(permissions.demos.view)
    getDemoOr404(id)
    return statusHistoriesDb
      .filter((h) => h.demoId === id)
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
      .map(({ fromStatus, toStatus, reason, changedByName, changedAt }) => ({
        fromStatus,
        toStatus,
        reason,
        changedByName,
        changedAt,
      }))
  },

  /** Tải ảnh (BR-07): JPG/PNG/WebP, tối đa 2 MB, rộng ≥ 1280 px, tối đa 8 ảnh; ảnh hợp lệ vẫn được nhận */
  async uploadScreenshots(id: string, files: File[]): Promise<UploadScreenshotsResult> {
    await mockDelay(300, 600)
    requirePermission(permissions.demos.update)
    const demo = getDemoOr404(id)
    const accepted: Screenshot[] = []
    const rejected: UploadScreenshotsResult['rejected'] = []
    let count = demo.screenshots.length
    let maxOrder = demo.screenshots.reduce((acc, s) => Math.max(acc, s.sortOrder), 0)
    const hasCover = demo.screenshots.some((s) => s.isCover)

    for (const file of files) {
      if (!(SCREENSHOT_TYPES as readonly string[]).includes(file.type)) {
        rejected.push({ fileName: file.name, reason: screenshotMessages.type })
        continue
      }
      if (file.size > demoLimits.screenshotMaxBytes) {
        rejected.push({ fileName: file.name, reason: screenshotMessages.size })
        continue
      }
      const size = await readImageSize(file)
      if (size.width < demoLimits.screenshotMinWidth) {
        rejected.push({ fileName: file.name, reason: screenshotMessages.width })
        continue
      }
      if (count >= demoLimits.screenshotsMax) {
        rejected.push({ fileName: file.name, reason: screenshotMessages.count })
        continue
      }
      const stored = await mockBlobs.put(file, file.name)
      maxOrder += 1
      count += 1
      accepted.push({
        id: newId(),
        url: stored.url,
        caption: null,
        width: size.width,
        height: size.height,
        sizeBytes: file.size,
        sortOrder: maxOrder,
        isCover: !hasCover && accepted.length === 0,
      })
    }

    if (accepted.length) {
      const latest = getDemoOr404(id)
      demosDb.update(id, {
        screenshots: normalizeScreenshots([...latest.screenshots, ...accepted]),
        updatedAt: nowIso(),
      })
    }
    const saved = getDemoOr404(id).screenshots
    return { accepted: saved.filter((s) => accepted.some((a) => a.id === s.id)), rejected }
  },

  /** Sửa chú thích, thứ tự, ảnh đại diện */
  async updateScreenshots(id: string, request: UpdateScreenshotsRequest): Promise<Screenshot[]> {
    await mockDelay()
    requirePermission(permissions.demos.update)
    const demo = getDemoOr404(id)
    const items = request.items ?? []
    const errors: FieldErrors = {}
    if (
      items.length !== demo.screenshots.length ||
      !demo.screenshots.every((s) => items.some((i) => i.id === s.id))
    ) {
      throw validation({ items: 'Danh sách ảnh đã thay đổi, tải lại trang rồi thử lại' })
    }
    items.forEach((item, index) => {
      if ((item.caption?.trim().length ?? 0) > demoLimits.captionMax) {
        errors[`items[${index}].caption`] = `Chú thích tối đa ${demoLimits.captionMax} ký tự`
      }
    })
    if (items.length && items.filter((i) => i.isCover).length !== 1)
      errors.items = 'Chọn đúng 1 ảnh đại diện'
    if (Object.keys(errors).length) throw validation(errors)

    const next = normalizeScreenshots(
      demo.screenshots.map((shot) => {
        const item = items.find((i) => i.id === shot.id)!
        return {
          ...shot,
          caption: blankToNull(item.caption),
          sortOrder: item.sortOrder,
          isCover: item.isCover,
        }
      })
    )
    demosDb.update(id, { screenshots: next, updatedAt: nowIso() })
    return next
  },

  /** Xóa ảnh; xóa ảnh đại diện thì ảnh kế tiếp thành đại diện; không xóa ảnh cuối của demo công khai (BR-02) */
  async deleteScreenshot(id: string, screenshotId: string): Promise<Screenshot[]> {
    await mockDelay()
    requirePermission(permissions.demos.update)
    const demo = getDemoOr404(id)
    const shot = demo.screenshots.find((s) => s.id === screenshotId)
    if (!shot) throw notFound('Không tìm thấy ảnh')
    if (isPublicDemo(demo) && demo.screenshots.length <= 1) throw domain(demoErrors.lastScreenshot)

    const sorted = [...demo.screenshots].sort((a, b) => a.sortOrder - b.sortOrder)
    const index = sorted.findIndex((s) => s.id === screenshotId)
    const rest = sorted.filter((s) => s.id !== screenshotId)
    if (shot.isCover && rest.length) {
      const nextCover = rest[Math.min(index, rest.length - 1)].id
      rest.forEach((s) => (s.isCover = s.id === nextCover))
    }
    const next = normalizeScreenshots(rest)
    demosDb.update(id, { screenshots: next, updatedAt: nowIso() })
    if (mockBlobs.isIdbUrl(shot.url)) await mockBlobs.remove(shot.url).catch(() => undefined)
    return next
  },
}
