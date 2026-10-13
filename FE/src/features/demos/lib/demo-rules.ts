import { normalizeVi } from '@/lib/normalize'
import { devStatusOrder, type DemoDevStatus } from '../types/demo.types'

/**
 * Quy tắc nghiệp vụ demo dùng chung cho form (Zod), handler mock và giao diện,
 * để hai phía báo cùng một thông báo (02-SRS §4). File thuần, chạy được cả phía máy chủ.
 */

// ───────────────────────── Giới hạn (BR-04, BR-07, BR-08, BR-09, BR-16, BR-18) ─────────────────────────

export const demoLimits = {
  featuredMax: 6,
  nameMax: 60,
  shortDescriptionMin: 50,
  shortDescriptionMax: 160,
  featuresMax: 6,
  featuresMinToShow: 3,
  featureMax: 80,
  keywordsMax: 10,
  keywordMax: 40,
  internalNotesMax: 2000,
  accountsMax: 6,
  screenshotsMax: 8,
  screenshotMaxBytes: 2 * 1024 * 1024,
  screenshotMinWidth: 1280,
  captionMax: 125,
  reasonMin: 10,
  reasonMax: 500,
  sortOrderMin: 1,
  sortOrderMax: 999,
} as const

export const SCREENSHOT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Lý do từ chối ảnh, đúng chữ TC-28, TC-29 (BR-07) */
export const screenshotMessages = {
  type: 'Chỉ nhận JPG, PNG, WebP',
  size: 'Ảnh vượt 2 MB',
  width: 'Ảnh cần rộng tối thiểu 1280 px',
  count: 'Mỗi demo tối đa 8 ảnh',
} as const

/** Thông báo lỗi nghiệp vụ, đúng chữ 07-DANH-SACH-API §3 */
export const demoErrors = {
  notEligible: 'Demo chưa đủ điều kiện hiển thị',
  visibleLocked: 'Demo đang hiển thị, cần tắt hiển thị trước',
  lastScreenshot: 'Demo đang công khai cần ít nhất 1 ảnh chụp',
  featuredMax: 'Tối đa 6 demo nổi bật, hãy bỏ bớt một demo',
  featuredNotPublic: 'Chỉ demo công khai mới được đánh dấu nổi bật',
  newCannotShow: 'Chuyển sang Đang làm trở lên trước',
  everPublished: 'Demo đã từng công khai, chỉ tắt hiển thị được',
  sortNeedsNoFilter: 'Bỏ lọc để sắp xếp toàn bộ danh sách',
} as const

// ───────────────────────── Định dạng (BR-05, BR-09) ─────────────────────────

/** BR-05: 3–60 ký tự, chữ thường không dấu, số, "-", không bắt đầu/kết thúc bằng "-" */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,58})[a-z0-9]$/
export const SLUG_MESSAGE =
  'Slug 3–60 ký tự, gồm chữ thường không dấu, số, dấu -, không bắt đầu hoặc kết thúc bằng -'

/** BR-09: 3–40 ký tự, chữ thường không dấu, số, "-" */
export const PROJECT_CODE_PATTERN = /^[a-z0-9-]{3,40}$/
export const PROJECT_CODE_MESSAGE = 'Mã dự án 3–40 ký tự, gồm chữ thường không dấu, số, dấu -'

/** Link phải bắt đầu bằng http:// hoặc https:// (UC-05 E3) */
export const URL_MESSAGE = 'Link phải bắt đầu bằng http:// hoặc https://'
export function isValidHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false
  const text = value.trim()
  if (!/^https?:\/\/\S+$/i.test(text)) return false
  try {
    const url = new URL(text)
    return !!url.hostname
  } catch {
    return false
  }
}

/** Số thứ tự 2 chữ số: "02" */
export const padNumber = (n: number) => String(n).padStart(2, '0')

/** BR-09: thư mục = {số thứ tự}-{mã dự án}, vd 02-fnb-pos-cafe */
export const demoFolder = (number: number, projectCode: string) =>
  `${padNumber(number)}-${projectCode}`

/** BR-05: "POS Quán Cafe" → "pos-quan-cafe" */
export function slugify(text: string): string {
  return normalizeVi(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}

/** BR-05: slug trùng thì thêm -2, -3… */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const root = base || 'demo'
  if (!used.has(root)) return root
  for (let i = 2; i < 1000; i++) {
    const suffix = `-${i}`
    const candidate = `${root.slice(0, 60 - suffix.length).replace(/-+$/g, '')}${suffix}`
    if (!used.has(candidate)) return candidate
  }
  return root
}

// ───────────────────────── Trạng thái (BR-01, BR-11) ─────────────────────────

export const statusRank = (status: DemoDevStatus) => devStatusOrder.indexOf(status)

/** Lùi bậc thì bắt buộc lý do 10–500 ký tự (BR-11) */
export const isBackward = (from: DemoDevStatus, to: DemoDevStatus) =>
  statusRank(to) < statusRank(from)

/** Trạng thái được khách mở demo: Demo được, Hoàn thiện */
export const isRunnableStatus = (status: DemoDevStatus) =>
  status === 'DemoDuoc' || status === 'HoanThien'

/** Công khai: bật Hiển thị và ở Demo được/Hoàn thiện (thuật ngữ 02-SRS §1.3) */
export const isPublicDemo = (demo: { isVisible: boolean; devStatus: DemoDevStatus }) =>
  demo.isVisible && isRunnableStatus(demo.devStatus)

/** Xuất hiện trên danh mục: bật Hiển thị và không phải Mới tạo (BR-01) */
export const isListedDemo = (demo: { isVisible: boolean; devStatus: DemoDevStatus }) =>
  demo.isVisible && demo.devStatus !== 'MoiTao'

// ───────────────────────── Điều kiện hiển thị (BR-01, BR-02) ─────────────────────────

export type VisibilityInput = {
  devStatus: DemoDevStatus
  shortDescription?: string | null
  features: string[]
  screenshotCount: number
  demoUrl?: string | null
  requiresLogin: boolean
  accountCount: number
}

export type VisibilityCondition = {
  key: 'status' | 'shortDescription' | 'features' | 'screenshots' | 'demoUrl' | 'accounts'
  /** Mô tả điều kiện (danh sách check xanh / x đỏ) */
  label: string
  /** Thông báo khi thiếu (mảng missing của API) */
  missing: string
  ok: boolean
}

/**
 * Danh sách điều kiện để bật Hiển thị với trạng thái hiện tại.
 * Mới tạo: không bật được. Đang làm: mô tả ngắn + 3 tính năng. Demo được, Hoàn thiện: thêm ảnh, link, tài khoản.
 */
export function visibilityConditions(input: VisibilityInput): VisibilityCondition[] {
  const features = input.features.filter((f) => f.trim())
  const shortLength = input.shortDescription?.trim().length ?? 0
  const list: VisibilityCondition[] = [
    {
      key: 'status',
      label: 'Trạng thái từ Đang làm trở lên',
      missing: demoErrors.newCannotShow,
      ok: input.devStatus !== 'MoiTao',
    },
    {
      key: 'shortDescription',
      label: 'Có mô tả ngắn',
      missing: 'Cần mô tả ngắn',
      ok: shortLength > 0,
    },
    {
      key: 'features',
      label: `Có ít nhất ${demoLimits.featuresMinToShow} tính năng nổi bật`,
      missing: `Cần ít nhất ${demoLimits.featuresMinToShow} tính năng nổi bật`,
      ok: features.length >= demoLimits.featuresMinToShow,
    },
  ]
  if (input.devStatus === 'MoiTao' || isRunnableStatus(input.devStatus)) {
    list.push(
      {
        key: 'screenshots',
        label: 'Có ít nhất 1 ảnh chụp màn hình',
        missing: 'Cần ít nhất 1 ảnh chụp màn hình',
        ok: input.screenshotCount > 0,
      },
      {
        key: 'demoUrl',
        label: 'Có link demo hợp lệ',
        missing: 'Cần link demo hợp lệ',
        ok: isValidHttpUrl(input.demoUrl),
      }
    )
    if (input.requiresLogin) {
      list.push({
        key: 'accounts',
        label: 'Có ít nhất 1 tài khoản demo',
        missing: 'Cần ít nhất 1 tài khoản demo',
        ok: input.accountCount > 0,
      })
    }
  }
  return list
}

/**
 * Mục còn thiếu để demo được hiển thị ở trạng thái `devStatus` (BR-01, BR-02).
 * Với Mới tạo chỉ trả "Chuyển sang Đang làm trở lên trước".
 */
export function visibilityMissing(input: VisibilityInput): string[] {
  if (input.devStatus === 'MoiTao') return [demoErrors.newCannotShow]
  return visibilityConditions(input)
    .filter((c) => !c.ok)
    .map((c) => c.missing)
}

// ───────────────────────── Thứ tự danh mục (BR-04) ─────────────────────────

const collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true })

export type CatalogOrderInput = {
  isComingSoon: boolean
  isFeatured: boolean
  sortOrder: number
  name: string
}

/**
 * BR-04: (1) công khai trước Sắp ra mắt; (2) trong mỗi phần nổi bật trước;
 * (3) thứ tự tăng dần; (4) tên A → Z.
 */
export function compareCatalogOrder(a: CatalogOrderInput, b: CatalogOrderInput): number {
  if (a.isComingSoon !== b.isComingSoon) return a.isComingSoon ? 1 : -1
  if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return collator.compare(a.name, b.name)
}

/** Sắp xếp bảng quản trị: thứ tự tăng dần, rồi tên. */
export function compareSortOrder(
  a: { sortOrder: number; name: string },
  b: { sortOrder: number; name: string }
) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return collator.compare(a.name, b.name)
}

// ───────────────────────── Tìm kiếm (BR-03) ─────────────────────────

/** Từ khóa dưới 2 ký tự (sau chuẩn hóa) thì không lọc */
export const SEARCH_MIN_LENGTH = 2

/**
 * BR-03: chuỗi từ khóa đã chuẩn hóa (chữ thường, bỏ dấu, đ → d, gộp khoảng trắng) nằm trong
 * tên, mô tả ngắn, một tính năng nổi bật hoặc một từ khóa của demo.
 */
export function matchesDemoKeyword(
  demo: { name: string; shortDescription?: string | null; features: string[]; keywords: string[] },
  keyword: string | null | undefined
): boolean {
  const query = normalizeVi(keyword)
  if (query.length < SEARCH_MIN_LENGTH) return true
  const fields = [demo.name, demo.shortDescription ?? '', ...demo.features, ...demo.keywords]
  return fields.some((field) => normalizeVi(field).includes(query))
}

// ───────────────────────── Tỉ lệ (BR-15) ─────────────────────────

/** BR-15: lượt mở ÷ lượt xem × 100, làm tròn 1 chữ số; lượt xem 0 thì null (hiển thị "—") */
export function openRate(opens: number, views: number): number | null {
  if (!views) return null
  return Math.round((opens / views) * 1000) / 10
}

/** Phần trăm làm tròn 1 chữ số */
export function sharePercent(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 1000) / 10
}
