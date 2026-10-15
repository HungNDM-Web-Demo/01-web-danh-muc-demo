'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, LogIn, MessageCircle, Phone } from 'lucide-react'
import { BrandMark } from '@/components/shared/BrandLogo'
import { Button } from '@/components/ui/button'
import { appConfig } from '@/config/app.config'
import { routePath } from '@/config/route-path'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { cn } from '@/lib/utils'
import { usePublicBrand } from '../hooks/use-public-brand'

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

/** Đã cuộn khỏi đầu trang chưa (bật kính mờ cho thanh đầu); phía máy chủ luôn là chưa cuộn */
function useScrolled(threshold = 8) {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > threshold,
    () => false
  )
}

/**
 * Thanh đầu trang công khai (FR-05, 08-THIET-KE-GIAO-DIEN §3): logo, tên công ty, hotline (bấm là gọi),
 * nút Zalo, Đăng nhập. Dính đầu trang; khi cuộn thì nền bán trong suốt + kính mờ.
 */
export function PublicHeader() {
  const brand = usePublicBrand()
  const scrolled = useScrolled()
  const { hydrated, isAuthenticated } = useAuth()
  const pathname = usePathname()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-200',
        scrolled
          ? 'bg-background/80 supports-[backdrop-filter]:bg-background/65 border-border shadow-[0_1px_12px_-6px_rgb(15_23_42/0.18)] backdrop-blur-md'
          : 'border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Link
          href={routePath.catalog}
          className="focus-visible:ring-ring/50 -m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 outline-none focus-visible:ring-3"
          aria-label={`${brand.companyName}: về trang danh mục`}
        >
          <BrandMark size="md" logoUrl={brand.logoUrl || null} appName={brand.appName} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[0.9375rem] font-semibold tracking-tight sm:text-base">
              {brand.companyName}
            </span>
            <span className="text-muted-foreground hidden truncate text-xs sm:block">
              {brand.appName}
            </span>
          </span>
        </Link>

        <nav aria-label="Liên hệ" className="flex shrink-0 items-center gap-1 sm:gap-2">
          {brand.hotlineHref && (
            <Button asChild variant="ghost" className="size-11 px-0 md:size-auto md:h-10 md:px-3">
              <a href={brand.hotlineHref} aria-label={`Gọi hotline ${brand.hotlineDisplay}`}>
                <Phone className="text-primary size-[1.125rem]" aria-hidden="true" />
                <span className="hidden font-semibold tabular-nums md:inline">
                  {brand.hotlineDisplay}
                </span>
              </a>
            </Button>
          )}
          {brand.zaloHref && (
            <Button asChild className="h-10 rounded-xl px-3 max-sm:min-h-11">
              <a
                href={brand.zaloHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Nhắn Zalo (mở tab mới)"
              >
                <MessageCircle aria-hidden="true" />
                Zalo
              </a>
            </Button>
          )}
          {appConfig.publicOnly ? null : hydrated && isAuthenticated ? (
            <Button
              asChild
              variant="outline"
              className="size-11 rounded-xl px-0 sm:size-auto sm:h-10 sm:px-3"
            >
              <Link href={appConfig.homeAfterLogin} aria-label="Vào trang quản trị">
                <LayoutGrid aria-hidden="true" />
                <span className="hidden sm:inline">Quản trị</span>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              className="size-11 rounded-xl px-0 sm:size-auto sm:h-10 sm:px-3"
            >
              <Link
                href={`${routePath.login}?redirect=${encodeURIComponent(pathname || '/')}`}
                aria-label="Đăng nhập quản trị"
              >
                <LogIn aria-hidden="true" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
