import { headers } from 'next/headers'

const DEFAULT_SITE_URL = 'http://localhost:3101'

/**
 * Địa chỉ gốc của trang công khai (link tuyệt đối cho ảnh chia sẻ, sitemap, robots).
 * Ưu tiên NEXT_PUBLIC_SITE_URL; không có thì lấy theo host của request (chạy sau proxy vẫn đúng).
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured
  try {
    const list = await headers()
    const host = list.get('x-forwarded-host') ?? list.get('host')
    if (!host) return DEFAULT_SITE_URL
    const proto =
      list.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
      (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  } catch {
    return DEFAULT_SITE_URL
  }
}
