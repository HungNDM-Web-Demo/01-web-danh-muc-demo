import demoData from '@/mock/seed/demo-data.json'
import { appConfig } from '@/config/app.config'
import { mockDb } from '@/mock/mock-db'
import { daysAgo, stableId } from '@/mock/mock-helpers'
import { localDateKey } from '../lib/date-key'
import { demoFolder, padNumber } from '../lib/demo-rules'
import type { DemoAccountItem, DemoDevStatus, DemoFaqItem, Screenshot } from '../types/demo.types'

/**
 * Bản ghi dữ liệu mẫu nghiệp vụ (bảng Cms_* trong 06-THIET-KE-CSDL) và hàm nạp từ
 * `src/mock/seed/demo-data.json` (nguồn duy nhất, BE DemoDataSeeder nhúng cùng file).
 *
 * File thuần (không đọc localStorage) nên dùng được cả phía máy chủ: trang công khai render sẵn
 * ở chế độ mock tính từ chính các hàm seed này (KIEN-TRUC-HE-THONG §6.3).
 *
 * Trường seed chưa có thì suy ra theo quy ước kho (ZDOCS/02-KE-HOACH/DANH-SACH-DU-AN.md):
 * - sortOrder = số thứ tự × 10 (TC-38)
 * - demoUrl = http://localhost:31NN, swaggerUrl = https://localhost:71NN/swagger
 * - repoUrl = https://github.com/HungNDM-Web-Demo/{thư mục}
 * - demoPassword = mật khẩu demo chung (DEMO_PASSWORD) khi "Cần đăng nhập"
 * - ảnh: url /seed/demos/{slug}/{file}, thiếu width/height thì coi 1600×1000
 */

// Sửa demo-data.json là trình duyệt tự bỏ dữ liệu mẫu cũ (xem MockDb.registerSeed)
mockDb.registerSeed('demo-data', demoData)

// ───────────────────────── Bản ghi ─────────────────────────

export type IndustryRecord = {
  id: string
  code: number
  name: string
  slug: string
  icon: string | null
  color: string
  description: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type DemoRecord = {
  id: string
  number: number
  projectCode: string
  name: string
  slug: string
  industryId: string
  ideaCode: string | null
  targetCustomers: string | null
  problemSolved: string | null
  productType: string | null
  devices: string | null
  shortDescription: string | null
  description: string | null
  features: string[]
  keywords: string[]
  demoUrl: string | null
  swaggerUrl: string | null
  repoUrl: string | null
  ownerName: string | null
  requiresLogin: boolean
  demoPassword: string | null
  internalNotes: string | null
  demoScript: string | null
  devStatus: DemoDevStatus
  isVisible: boolean
  isFeatured: boolean
  sortOrder: number
  firstPublishedAt: string | null
  createdAt: string
  updatedAt: string
  /** Cms_DemoAccounts (thứ tự mảng = SortOrder) */
  accounts: DemoAccountItem[]
  /** Cms_DemoFaqs */
  faqs: DemoFaqItem[]
  /** Cms_DemoScreenshots */
  screenshots: Screenshot[]
}

/** Cms_DemoSlugHistories */
export type SlugHistoryRecord = { id: string; demoId: string; slug: string; changedAt: string }

/** Cms_DemoStatusHistories */
export type StatusHistoryRecord = {
  id: string
  demoId: string
  fromStatus: DemoDevStatus | null
  toStatus: DemoDevStatus
  reason: string | null
  changedByName: string
  changedAt: string
}

/** Cms_DemoVisits: sự kiện thô, chỉ dùng chống tính trùng 30 phút (BR-14) */
export type VisitRecord = {
  id: string
  demoId: string
  type: 'View' | 'Open'
  visitorId: string
  device: 'Mobile' | 'Desktop'
  referrer: string | null
  occurredAt: string
}

/** Cms_DemoVisitStats: tổng hợp theo ngày */
export type VisitStatRecord = {
  id: string
  demoId: string
  /** yyyy-MM-dd theo giờ máy */
  date: string
  views: number
  opens: number
  mobileViews: number
  desktopViews: number
}

// ───────────────────────── Kiểu dữ liệu JSON ─────────────────────────

type SeedIndustry = {
  code: number
  name: string
  slug: string
  icon?: string | null
  color: string
  sortOrder: number
  description?: string | null
}

type SeedScreenshot = {
  file: string
  caption?: string | null
  width?: number
  height?: number
  sizeBytes?: number
  isCover?: boolean
}

type SeedDemo = {
  number: number
  projectCode: string
  name: string
  slug: string
  industry: string
  ideaCode?: string | null
  targetCustomers?: string | null
  problemSolved?: string | null
  productType?: string | null
  devices?: string | null
  shortDescription?: string | null
  description?: string | null
  features?: string[]
  keywords?: string[]
  demoUrl?: string | null
  swaggerUrl?: string | null
  repoUrl?: string | null
  ownerName?: string | null
  requiresLogin?: boolean
  demoPassword?: string | null
  internalNotes?: string | null
  demoScript?: string | null
  devStatus: DemoDevStatus
  isVisible?: boolean
  isFeatured?: boolean
  sortOrder?: number
  firstPublishedDaysAgo?: number | null
  createdDaysAgo?: number
  updatedDaysAgo?: number
  accounts?: DemoAccountItem[]
  faqs?: DemoFaqItem[]
  screenshots?: SeedScreenshot[]
  statusHistory?: {
    from: DemoDevStatus | null
    to: DemoDevStatus
    daysAgo: number
    reason?: string | null
    by?: string
  }[]
}

type SeedVisitStat = {
  demo: string
  dayOffset: number
  views: number
  opens: number
  mobileViews: number
  desktopViews: number
}

type SeedFile = { industries: SeedIndustry[]; demos: SeedDemo[]; visitStats: SeedVisitStat[] }

const seed = demoData as unknown as SeedFile

/** Kích thước mặc định khi ảnh mẫu chưa ghi width/height */
const DEFAULT_SIZE = { width: 1600, height: 1000 }
/** Người đổi trạng thái trong lịch sử mẫu (tài khoản demo Quản lý) */
const SEED_CHANGED_BY = 'admin'

// ───────────────────────── Id cố định ─────────────────────────

export const industryIdOf = (code: number) => stableId('industry', code)
export const demoIdOf = (projectCode: string) => stableId('demo', projectCode)
export const screenshotIdOf = (slug: string, file: string) => stableId('screenshot', slug, file)

export { localDateKey }

/** Ngày "yyyy-MM-dd" lệch n ngày so với hôm nay (n âm là quá khứ) */
export function dateKeyOffset(offset: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return localDateKey(date)
}

// ───────────────────────── Hàm nạp seed ─────────────────────────

export function seedIndustries(): IndustryRecord[] {
  return seed.industries.map((item, index) => ({
    id: industryIdOf(item.code),
    code: item.code,
    name: item.name,
    slug: item.slug,
    icon: item.icon ?? null,
    color: item.color,
    description: item.description ?? null,
    sortOrder: item.sortOrder ?? index + 1,
    createdAt: daysAgo(150, '08:00'),
    updatedAt: daysAgo(150, '08:00'),
  }))
}

function seedScreenshots(demo: SeedDemo): Screenshot[] {
  const list = demo.screenshots ?? []
  const coverIndex = Math.max(
    0,
    list.findIndex((s) => s.isCover)
  )
  return list.map((shot, index) => ({
    id: screenshotIdOf(demo.slug, shot.file),
    url: `/seed/demos/${demo.slug}/${shot.file}`,
    caption: shot.caption ?? null,
    width: shot.width ?? DEFAULT_SIZE.width,
    height: shot.height ?? DEFAULT_SIZE.height,
    sizeBytes: shot.sizeBytes ?? 0,
    sortOrder: index + 1,
    isCover: index === coverIndex,
  }))
}

export function seedDemos(): DemoRecord[] {
  const industries = seedIndustries()
  return seed.demos.map((demo) => {
    const industry =
      industries.find((i) => i.slug === demo.industry) ?? industries[industries.length - 1]
    const folder = demoFolder(demo.number, demo.projectCode)
    const requiresLogin = demo.requiresLogin ?? true
    const createdAt = daysAgo(demo.createdDaysAgo ?? 60, '09:00')
    // Bản quảng bá (publicOnly): demo chưa có link thật thì hiện "Sắp ra mắt", không trỏ về localhost
    const notDeployed =
      appConfig.publicOnly &&
      !demo.demoUrl &&
      (demo.devStatus === 'DemoDuoc' || demo.devStatus === 'HoanThien')
    return {
      id: demoIdOf(demo.projectCode),
      number: demo.number,
      projectCode: demo.projectCode,
      name: demo.name,
      slug: demo.slug,
      industryId: industry.id,
      ideaCode: demo.ideaCode ?? null,
      targetCustomers: demo.targetCustomers ?? null,
      problemSolved: demo.problemSolved ?? null,
      productType: demo.productType ?? null,
      devices: demo.devices ?? null,
      shortDescription: demo.shortDescription ?? null,
      description: demo.description ?? null,
      features: [...(demo.features ?? [])],
      keywords: [...(demo.keywords ?? [])],
      demoUrl: demo.demoUrl ?? `http://localhost:31${padNumber(demo.number)}`,
      swaggerUrl: demo.swaggerUrl ?? `https://localhost:71${padNumber(demo.number)}/swagger`,
      repoUrl: demo.repoUrl ?? `https://github.com/HungNDM-Web-Demo/${folder}`,
      ownerName: demo.ownerName ?? null,
      requiresLogin,
      demoPassword: demo.demoPassword ?? (requiresLogin ? appConfig.demoPassword : null),
      internalNotes: demo.internalNotes ?? null,
      demoScript: demo.demoScript ?? null,
      devStatus: notDeployed ? 'DangLam' : demo.devStatus,
      isVisible: demo.isVisible ?? false,
      isFeatured: notDeployed ? false : (demo.isFeatured ?? false),
      sortOrder: demo.sortOrder ?? demo.number * 10,
      firstPublishedAt:
        demo.firstPublishedDaysAgo === null || demo.firstPublishedDaysAgo === undefined
          ? null
          : daysAgo(demo.firstPublishedDaysAgo, '10:00'),
      createdAt,
      updatedAt: daysAgo(demo.updatedDaysAgo ?? 1, '16:30'),
      accounts: (demo.accounts ?? []).map((a) => ({
        username: a.username,
        roleName: a.roleName,
        purpose: a.purpose ?? null,
      })),
      faqs: (demo.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
      screenshots: seedScreenshots(demo),
    }
  })
}

export function seedStatusHistories(): StatusHistoryRecord[] {
  return seed.demos.flatMap((demo) =>
    (demo.statusHistory ?? []).map((h, index) => ({
      id: stableId('status-history', demo.projectCode, index),
      demoId: demoIdOf(demo.projectCode),
      fromStatus: h.from ?? null,
      toStatus: h.to,
      reason: h.reason ?? null,
      changedByName: h.by ?? SEED_CHANGED_BY,
      changedAt: daysAgo(h.daysAgo, `${String(9 + (index % 8)).padStart(2, '0')}:15`),
    }))
  )
}

export function seedVisitStats(): VisitStatRecord[] {
  const idBySlug = new Map(seed.demos.map((d) => [d.slug, demoIdOf(d.projectCode)]))
  return seed.visitStats
    .filter((s) => idBySlug.has(s.demo))
    .map((s) => {
      const demoId = idBySlug.get(s.demo)!
      const date = dateKeyOffset(s.dayOffset)
      return {
        id: stableId('visit-stat', demoId, date),
        demoId,
        date,
        views: s.views,
        opens: s.opens,
        mobileViews: s.mobileViews,
        desktopViews: s.desktopViews,
      }
    })
}
