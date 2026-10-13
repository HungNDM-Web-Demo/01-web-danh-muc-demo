import { mockDelay } from '@/lib/data-source'
import { isListedDemo } from '@/features/demos/lib/demo-rules'
import { localDateKey } from '@/features/demos/lib/date-key'
import { catalogSource, demosDb, visitsDb, visitStatsDb } from '@/features/demos/mock/demo.db'
import { currentContext } from '@/mock/mock-auth'
import { mockDb } from '@/mock/mock-db'
import { notFound, validation } from '@/mock/mock-errors'
import { newId } from '@/mock/mock-helpers'
import {
  buildPublicDemos,
  buildPublicIndustries,
  buildPublicLookup,
} from '../lib/catalog-projection'
import type {
  PublicDemoCard,
  PublicDemoLookup,
  PublicIndustry,
  RecordVisitRequest,
  RecordVisitResponse,
} from '../types/catalog.types'

/** Không tính bot (BR-14) */
const BOT_PATTERN = /bot|crawler|spider|facebookexternalhit/i
/** Cùng trình duyệt, cùng demo trong 30 phút chỉ tính 1 lượt mỗi loại (BR-14) */
const DEDUPE_MS = 30 * 60_000
/** Sự kiện thô cũ hơn 2 ngày thì dọn (06-THIET-KE-CSDL, Cms_DemoVisits) */
const KEEP_MS = 2 * 86_400_000

/** Handler API công khai `/api/public/*` ở chế độ mock: không cần đăng nhập, chỉ trả trường công khai. */
export const catalogMock = {
  async getIndustries(): Promise<PublicIndustry[]> {
    await mockDelay(60, 160)
    return buildPublicIndustries(catalogSource())
  },

  async getDemos(): Promise<PublicDemoCard[]> {
    await mockDelay(60, 160)
    return buildPublicDemos(catalogSource())
  },

  async getDemo(slug: string): Promise<PublicDemoLookup> {
    await mockDelay(60, 160)
    const lookup = buildPublicLookup(catalogSource(), slug)
    if (!lookup) throw notFound('Không tìm thấy demo')
    return lookup
  },

  /** POST /api/public/demos/{slug}/visits (FR-27, BR-14) */
  async recordVisit(slug: string, request: RecordVisitRequest): Promise<RecordVisitResponse> {
    await mockDelay(30, 80)
    const visitorId = request.visitorId?.trim() ?? ''
    if (visitorId.length < 16 || visitorId.length > 64) {
      throw validation({ visitorId: 'Mã trình duyệt dài 16–64 ký tự' })
    }
    const demo = demosDb.find((d) => d.slug === slug)
    if (!demo || !isListedDemo(demo)) throw notFound('Không tìm thấy demo')

    // Không tính người đang đăng nhập và bot
    if (currentContext()) return { counted: false }
    if (typeof navigator !== 'undefined' && BOT_PATTERN.test(navigator.userAgent))
      return { counted: false }

    const now = Date.now()
    const duplicated = visitsDb.some(
      (v) =>
        v.demoId === demo.id &&
        v.visitorId === visitorId &&
        v.type === request.type &&
        now - new Date(v.occurredAt).getTime() < DEDUPE_MS
    )
    if (duplicated) return { counted: false }

    const date = localDateKey()
    mockDb.batch(() => {
      visitsDb.removeWhere((v) => now - new Date(v.occurredAt).getTime() > KEEP_MS)
      visitsDb.insert({
        id: newId(),
        demoId: demo.id,
        type: request.type,
        visitorId,
        device: request.device === 'Mobile' ? 'Mobile' : 'Desktop',
        referrer: request.referrer?.slice(0, 300) || null,
        occurredAt: new Date(now).toISOString(),
      })
      const isView = request.type === 'View'
      const isMobile = request.device === 'Mobile'
      const stat = visitStatsDb.find((s) => s.demoId === demo.id && s.date === date)
      if (stat) {
        visitStatsDb.update(stat.id, (s) => ({
          ...s,
          views: s.views + (isView ? 1 : 0),
          opens: s.opens + (isView ? 0 : 1),
          mobileViews: s.mobileViews + (isView && isMobile ? 1 : 0),
          desktopViews: s.desktopViews + (isView && !isMobile ? 1 : 0),
        }))
      } else {
        visitStatsDb.insert({
          id: newId(),
          demoId: demo.id,
          date,
          views: isView ? 1 : 0,
          opens: isView ? 0 : 1,
          mobileViews: isView && isMobile ? 1 : 0,
          desktopViews: isView && !isMobile ? 1 : 0,
        })
      }
    })
    return { counted: true }
  },
}
