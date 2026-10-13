'use client'

import Link from 'next/link'
import { LayoutGrid, Phone, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { routePath } from '@/config/route-path'
import { usePublicBrand } from '../hooks/use-public-brand'

/** FR-11, UC-02 E1: slug không tồn tại hoặc demo không hiển thị cho khách. */
export function DemoNotFound() {
  const brand = usePublicBrand()
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
        <SearchX className="size-8" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Không tìm thấy demo</h1>
      <p className="text-muted-foreground mt-3 text-pretty">
        Demo có thể đã đổi đường dẫn hoặc đang tạm ẩn. Mời bạn xem các demo khác trong danh mục,
        hoặc gọi để được giới thiệu trực tiếp.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button asChild size="lg" className="h-12 rounded-xl">
          <Link href={routePath.catalog}>
            <LayoutGrid aria-hidden="true" />
            Về danh mục
          </Link>
        </Button>
        {brand.hotlineHref && (
          <Button asChild size="lg" variant="outline" className="h-12 rounded-xl">
            <a href={brand.hotlineHref}>
              <Phone aria-hidden="true" />
              {brand.hotlineDisplay}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
