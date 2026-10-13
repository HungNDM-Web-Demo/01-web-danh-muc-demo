import { compareCatalogOrder, isListedDemo, isPublicDemo } from '@/features/demos/lib/demo-rules'
import type { DemoRecord, IndustryRecord, SlugHistoryRecord } from '@/features/demos/mock/demo.data'
import type {
  PublicDemoCard,
  PublicDemoDetail,
  PublicDemoLookup,
  PublicIndustry,
} from '../types/catalog.types'

/**
 * Chiếu dữ liệu demo sang DTO công khai (07-DANH-SACH-API §2), áp BR-01, BR-04, BR-07, BR-10, BR-13.
 * Hàm thuần: handler mock (dữ liệu trong trình duyệt) và trang render phía máy chủ ở chế độ mock
 * (dữ liệu seed) dùng chung, nên hai nơi luôn ra cùng kết quả.
 * Chỉ chép trường công khai, không bao giờ chép mật khẩu, ghi chú, kịch bản, Swagger, repo, người phụ trách.
 */

export type CatalogSource = {
  industries: IndustryRecord[]
  demos: DemoRecord[]
  slugHistories?: SlugHistoryRecord[]
}

/** BR-07: ảnh đại diện; chưa chọn thì lấy ảnh đầu tiên; chưa có ảnh thì null */
export function coverOf(demo: Pick<DemoRecord, 'screenshots'>): string | null {
  const sorted = [...demo.screenshots].sort((a, b) => a.sortOrder - b.sortOrder)
  return (sorted.find((s) => s.isCover) ?? sorted[0])?.url ?? null
}

function toCard(demo: DemoRecord, industry: IndustryRecord): PublicDemoCard {
  const isComingSoon = demo.devStatus === 'DangLam'
  return {
    slug: demo.slug,
    name: demo.name,
    industry: {
      slug: industry.slug,
      name: industry.name,
      color: industry.color,
      icon: industry.icon,
    },
    shortDescription: demo.shortDescription,
    coverUrl: coverOf(demo),
    devStatus: demo.devStatus,
    isComingSoon,
    demoUrl: isComingSoon ? null : demo.demoUrl,
    isFeatured: demo.isFeatured && isPublicDemo(demo),
    sortOrder: demo.sortOrder,
    features: [...demo.features],
    keywords: [...demo.keywords],
  }
}

/** GET /api/public/demos: demo hiển thị (BR-01), đúng thứ tự BR-04 */
export function buildPublicDemos(source: CatalogSource): PublicDemoCard[] {
  const industryById = new Map(source.industries.map((i) => [i.id, i]))
  return source.demos
    .filter(isListedDemo)
    .flatMap((demo) => {
      const industry = industryById.get(demo.industryId)
      return industry ? [toCard(demo, industry)] : []
    })
    .sort(compareCatalogOrder)
}

/** GET /api/public/industries: nhóm có ít nhất 1 demo hiển thị, số đếm gồm Sắp ra mắt (BR-13) */
export function buildPublicIndustries(source: CatalogSource): PublicIndustry[] {
  const demos = buildPublicDemos(source)
  return [...source.industries]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code - b.code)
    .map((industry) => ({
      slug: industry.slug,
      name: industry.name,
      icon: industry.icon,
      color: industry.color,
      sortOrder: industry.sortOrder,
      count: demos.filter((d) => d.industry.slug === industry.slug).length,
    }))
    .filter((industry) => industry.count > 0)
}

/**
 * GET /api/public/demos/{slug}: chi tiết demo hiển thị; slug cũ (BR-06) trả redirectSlug;
 * không có hoặc không hiển thị trả null (API trả 404).
 */
export function buildPublicLookup(source: CatalogSource, slug: string): PublicDemoLookup | null {
  const key = slug.trim().toLowerCase()
  const demo = source.demos.find((d) => d.slug === key)
  if (!demo) {
    const history = source.slugHistories?.find((h) => h.slug === key)
    const target = history && source.demos.find((d) => d.id === history.demoId)
    return target && isListedDemo(target) ? { redirectSlug: target.slug } : null
  }
  if (!isListedDemo(demo)) return null
  const industry = source.industries.find((i) => i.id === demo.industryId)
  if (!industry) return null
  return { demo: toPublicDetail(demo, industry, source) }
}

function toPublicDetail(
  demo: DemoRecord,
  industry: IndustryRecord,
  source: CatalogSource
): PublicDemoDetail {
  // FR-09: tối đa 3 demo công khai khác cùng nhóm, thứ tự BR-04
  const related = buildPublicDemos(source)
    .filter((d) => d.industry.slug === industry.slug && d.slug !== demo.slug && !d.isComingSoon)
    .slice(0, 3)
  return {
    ...toCard(demo, industry),
    targetCustomers: demo.targetCustomers,
    problemSolved: demo.problemSolved,
    description: demo.description,
    productType: demo.productType,
    devices: demo.devices,
    requiresLogin: demo.requiresLogin,
    accounts: demo.requiresLogin
      ? demo.accounts.map((a) => ({
          username: a.username,
          roleName: a.roleName,
          purpose: a.purpose ?? null,
        }))
      : [],
    screenshots: [...demo.screenshots]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        url: s.url,
        caption: s.caption ?? null,
        width: s.width,
        height: s.height,
        isCover: s.isCover,
      })),
    related,
    updatedAt: demo.updatedAt,
  }
}
