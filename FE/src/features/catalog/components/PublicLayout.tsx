import type { Metadata } from 'next'
import { getPublicSettingsServer } from '@/features/settings/services/setting.server'
import { getSiteUrl } from '../services/site-url.server'
import { PublicShell } from './PublicShell'

/** metadataBase để ảnh chia sẻ (FR-10) có link tuyệt đối khi gửi qua Zalo, Facebook. */
export async function publicLayoutMetadata(): Promise<Metadata> {
  return { metadataBase: new URL(await getSiteUrl()) }
}

/**
 * Layout trang công khai (SCR-01, SCR-02): không cần đăng nhập, render sẵn phía máy chủ (NFR-04),
 * HTML có sẵn tên, hotline công ty lấy từ cài đặt công khai (FR-05).
 */
export async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettingsServer()
  return <PublicShell settings={settings}>{children}</PublicShell>
}
