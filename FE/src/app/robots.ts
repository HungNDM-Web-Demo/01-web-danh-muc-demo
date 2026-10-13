import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/features/catalog/services/site-url.server'

/** Cho máy tìm kiếm đọc trang công khai; chặn khu quản trị, đăng nhập (NFR-04). */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/login', '/settings/', '/profile', '/dashboard', '/forbidden'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
