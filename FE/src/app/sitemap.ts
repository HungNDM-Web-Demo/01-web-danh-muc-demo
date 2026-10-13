import type { MetadataRoute } from 'next'
import { routeTo } from '@/config/route-path'
import { getPublicDemosServer } from '@/features/catalog/services/catalog.server'
import { getSiteUrl } from '@/features/catalog/services/site-url.server'

/** NFR-04: sitemap.xml liệt kê trang danh mục và demo đang hiển thị; demo chưa công khai không có. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteUrl, demos] = await Promise.all([getSiteUrl(), getPublicDemosServer()])
  const now = new Date()
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...demos.map((demo) => ({
      url: `${siteUrl}${routeTo.demoDetail(demo.slug)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: demo.isComingSoon ? 0.5 : demo.isFeatured ? 0.9 : 0.8,
    })),
  ]
}
