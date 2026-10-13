'use client'

import { usePathname } from 'next/navigation'
import { DemoToolbar } from '@/components/demo/DemoToolbar'
import { useAuth, useSyncCurrentUser } from '@/features/auth/hooks/use-auth'
import type { PublicSettings } from '@/features/settings/types/setting.types'
import { ServerSettingsContext } from '../hooks/use-public-brand'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'

/** Nhân viên đang đăng nhập: lấy lại quyền mới nhất (TC-19) và hiện thanh công cụ demo trên màn hình rộng. */
function SignedInExtras() {
  useSyncCurrentUser()
  return (
    <div className="hidden md:block">
      <DemoToolbar />
    </div>
  )
}

/**
 * Khung trang công khai (SCR-01, SCR-02): thanh đầu dính, nội dung, khối kêu gọi + chân trang.
 * `settings` là cài đặt công khai máy chủ đã lấy để HTML có sẵn tên, hotline công ty (NFR-04).
 */
export function PublicShell({
  settings,
  children,
}: {
  settings: PublicSettings
  children: React.ReactNode
}) {
  const { hydrated, isAuthenticated } = useAuth()
  const isDetail = usePathname()?.startsWith('/demos/') ?? false

  return (
    <ServerSettingsContext.Provider value={settings}>
      <div className="relative isolate flex min-h-svh flex-col">
        <a
          href="#noi-dung"
          className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Bỏ qua, tới nội dung
        </a>
        {/* Dải gradient rất nhạt từ màu chính ở đầu trang (08-THIET-KE-GIAO-DIEN §1) */}
        <div
          aria-hidden="true"
          className="from-primary/10 via-primary/[0.04] pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-gradient-to-b to-transparent"
        />
        <PublicHeader />
        <main id="noi-dung" className="flex-1">
          {children}
        </main>
        <PublicFooter />
        {/* Trang chi tiết có nút "Xem demo" dính đáy trên điện thoại: chừa chỗ để không che chân trang */}
        {isDetail && <div aria-hidden="true" className="h-24 lg:hidden" />}
        {hydrated && isAuthenticated && <SignedInExtras />}
      </div>
    </ServerSettingsContext.Provider>
  )
}
