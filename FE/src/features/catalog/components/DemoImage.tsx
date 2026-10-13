'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { cn } from '@/lib/utils'

type DemoImageProps = {
  /** `/seed/...` (FE phục vụ), `/uploads/...` (BE), `idb://` (mock), http(s) */
  src: string | null | undefined
  alt: string
  /** Thuộc tính sizes của next/image theo bố cục */
  sizes: string
  /** Ảnh trong màn hình đầu: tải ngay (không tải lười) */
  eager?: boolean
  /** Ưu tiên tải cao (ảnh LCP); mặc định theo `eager` */
  highPriority?: boolean
  /** Hiện khi chưa có ảnh hoặc ảnh lỗi (ảnh mặc định theo màu nhóm, BR-07) */
  fallback: React.ReactNode
  className?: string
  imageClassName?: string
}

/**
 * Ảnh chụp demo lấp đầy khung cha (relative, có tỉ lệ cố định để không nhảy bố cục).
 * Ảnh mẫu trong public/ đi qua bộ tối ưu next/image (WebP, đúng kích thước); ảnh tải lên ở chế độ mock
 * (IndexedDB) hoặc từ BE thì hiển thị nguyên bản. Ảnh lỗi thì thay bằng ảnh mặc định.
 */
export function DemoImage({
  src,
  alt,
  sizes,
  eager,
  highPriority = eager,
  fallback,
  className,
  imageClassName,
}: DemoImageProps) {
  const resolved = useAssetUrl(src)
  const [failed, setFailed] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)

  if (!src || (resolved && failed === resolved)) return <>{fallback}</>
  if (!resolved) {
    // Đang đọc ảnh từ IndexedDB
    return (
      <span
        className={cn('bg-muted absolute inset-0 animate-pulse', className)}
        aria-hidden="true"
      />
    )
  }

  const optimizable = resolved.startsWith('/') && !resolved.startsWith('//')
  return (
    <span className={cn('bg-muted absolute inset-0 block overflow-hidden', className)}>
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={!optimizable}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={highPriority ? 'high' : 'auto'}
        onError={() => setFailed(resolved)}
        onLoad={() => setLoaded(resolved)}
        className={cn(
          'object-cover object-top transition-opacity duration-300',
          // Ảnh màn hình đầu hiện ngay (không chờ JS) để không làm chậm LCP; ảnh tải lười thì hiện dần
          !eager && loaded !== resolved ? 'opacity-0' : 'opacity-100',
          imageClassName
        )}
      />
    </span>
  )
}
