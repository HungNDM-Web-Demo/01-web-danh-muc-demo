'use client'

import Link from 'next/link'
import { Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { BrandMark } from '@/components/shared/BrandLogo'
import { Button } from '@/components/ui/button'
import { appConfig } from '@/config/app.config'
import { routePath } from '@/config/route-path'
import { usePublicBrand } from '../hooks/use-public-brand'

/**
 * Khối kêu gọi "Chưa thấy giải pháp phù hợp?" + chân trang thông tin công ty
 * (08-THIET-KE-GIAO-DIEN §3, FR-05). Hotline bấm là gọi trên điện thoại.
 */
export function PublicFooter() {
  const brand = usePublicBrand()
  const year = new Date().getFullYear()
  const websiteLabel = brand.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')

  return (
    <footer className="mt-16 sm:mt-24">
      <section
        aria-labelledby="cta-title"
        className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-12">
          <span
            aria-hidden="true"
            className="absolute -top-24 -right-20 size-72 rounded-full bg-white/10 blur-2xl"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2
                id="cta-title"
                className="text-2xl font-bold tracking-tight text-balance sm:text-3xl"
              >
                Chưa thấy giải pháp phù hợp?
              </h2>
              <p className="text-primary-foreground/85 text-pretty">
                Gọi hoặc nhắn Zalo để được tư vấn theo đúng quy trình của doanh nghiệp bạn, hoặc
                đề tài đồ án của bạn. Có bản chuẩn sẵn nên triển khai nhanh hơn làm từ đầu.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {brand.hotlineHref && (
                <Button asChild variant="cta" size="lg" className="h-12 rounded-xl px-6 text-base">
                  <a href={brand.hotlineHref}>
                    <Phone aria-hidden="true" />
                    Gọi {brand.hotlineDisplay}
                  </a>
                </Button>
              )}
              {brand.zaloHref && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-foreground h-12 rounded-xl border-transparent px-6 text-base"
                >
                  <a href={brand.zaloHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" />
                    Nhắn Zalo
                    <span className="sr-only"> (mở tab mới)</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-12 border-t">
        <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:px-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandMark size="sm" logoUrl={brand.logoUrl || null} appName={brand.appName} />
              <p className="font-semibold">{brand.companyName}</p>
            </div>
            <p className="text-muted-foreground max-w-md text-sm text-pretty">
              {brand.appName}: các sản phẩm mẫu chạy được ngay, giúp bạn hình dung giải pháp trước
              khi triển khai.
            </p>
          </div>
          <ul className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
            {brand.hotlineHref && (
              <li>
                <a
                  href={brand.hotlineHref}
                  className="hover:text-foreground inline-flex min-h-11 items-center gap-2 transition-colors"
                >
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">{brand.hotlineDisplay}</span>
                </a>
              </li>
            )}
            {brand.email && (
              <li>
                <a
                  href={`mailto:${brand.email}`}
                  className="hover:text-foreground inline-flex min-h-11 items-center gap-2 break-all transition-colors"
                >
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {brand.email}
                </a>
              </li>
            )}
            {brand.website && (
              <li>
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground inline-flex min-h-11 items-center gap-2 break-all transition-colors"
                >
                  <Globe className="size-4 shrink-0" aria-hidden="true" />
                  {websiteLabel}
                </a>
              </li>
            )}
            {brand.address && (
              <li className="inline-flex min-h-11 items-center gap-2">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {brand.address}
              </li>
            )}
          </ul>
        </div>
        <div className="border-t">
          <div className="text-muted-foreground mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              © {year} {brand.companyName}
            </p>
            {!appConfig.publicOnly && (
              <Link
                href={routePath.login}
                className="hover:text-foreground w-fit underline-offset-4 hover:underline"
              >
                Đăng nhập quản trị
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
