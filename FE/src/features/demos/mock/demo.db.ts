import { mockDb } from '@/mock/mock-db'
import {
  seedDemos,
  seedIndustries,
  seedStatusHistories,
  seedVisitStats,
  type DemoRecord,
  type IndustryRecord,
  type SlugHistoryRecord,
  type StatusHistoryRecord,
  type VisitRecord,
  type VisitStatRecord,
} from './demo.data'

/**
 * Collection nghiệp vụ của Danh mục Demo trong mock-db (scope 'business': "Đặt lại dữ liệu" nạp lại seed).
 * Dùng chung cho handler demo, nhóm ngành, trang công khai, thống kê.
 */
export const industriesDb = mockDb.collection<IndustryRecord>('industries', seedIndustries)
export const demosDb = mockDb.collection<DemoRecord>('demos', seedDemos)
export const slugHistoriesDb = mockDb.collection<SlugHistoryRecord>('demo-slug-histories', () => [])
export const statusHistoriesDb = mockDb.collection<StatusHistoryRecord>(
  'demo-status-histories',
  seedStatusHistories
)
export const visitsDb = mockDb.collection<VisitRecord>('demo-visits', () => [])
export const visitStatsDb = mockDb.collection<VisitStatRecord>('demo-visit-stats', seedVisitStats)

/** Nguồn dữ liệu cho các hàm chiếu công khai (catalog-projection.ts) */
export const catalogSource = () => ({
  industries: industriesDb.all(),
  demos: demosDb.all(),
  slugHistories: slugHistoriesDb.all(),
})
