'use client'

import { useCallback, useRef, useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicScreenshot } from '../types/catalog.types'
import { DemoCoverArt } from './DemoCoverArt'
import { DemoImage } from './DemoImage'

type ScreenshotGalleryProps = {
  name: string
  screenshots: PublicScreenshot[]
  industry: { color: string; icon?: string | null }
}

/** Ngưỡng vuốt ngang (px) để chuyển ảnh */
const SWIPE_THRESHOLD = 48

const altOf = (name: string, shot: PublicScreenshot, index: number) =>
  shot.caption ? `${name}: ${shot.caption}` : `${name}: ảnh màn hình ${index + 1}`

/**
 * Thư viện ảnh chụp màn hình (FR-07, SCR-03): ảnh lớn 16:10, dãy ảnh nhỏ, bấm để phóng to toàn màn hình.
 * Hộp xem ảnh: nền tối 90%, chú thích dưới ảnh, nút trước/sau, phím ←/→/Esc, vuốt ngang trên điện thoại,
 * khóa cuộn trang, đóng thì trả focus về ảnh nhỏ đang xem. Demo chưa có ảnh dùng ảnh mặc định (BR-07).
 */
export function ScreenshotGallery({ name, screenshots, industry }: ScreenshotGalleryProps) {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const mainRef = useRef<HTMLButtonElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const count = screenshots.length

  const go = useCallback(
    (delta: number) => setActive((current) => (current + delta + count) % Math.max(count, 1)),
    [count]
  )

  const openAt = (index: number) => {
    setActive(index)
    setOpen(true)
  }

  if (count === 0) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border shadow-sm">
        <DemoCoverArt name={name} color={industry.color} icon={industry.icon} />
      </div>
    )
  }

  const current = screenshots[Math.min(active, count - 1)]
  const fallback = <DemoCoverArt name={name} color={industry.color} icon={industry.icon} />

  return (
    <div className="space-y-3">
      <button
        ref={mainRef}
        type="button"
        onClick={() => openAt(active)}
        className="group bg-muted focus-visible:ring-ring/50 relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border shadow-sm outline-none focus-visible:ring-3"
        aria-label={`Phóng to ảnh ${active + 1}/${count}${current.caption ? `: ${current.caption}` : ''}`}
      >
        <DemoImage
          src={current.url}
          alt={altOf(name, current, active)}
          sizes="(min-width: 1440px) 800px, (min-width: 1024px) 58vw, 100vw"
          eager
          fallback={fallback}
        />
        <span className="bg-background/90 text-foreground absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          <Expand className="size-3.5" aria-hidden="true" />
          Phóng to
        </span>
      </button>

      {count > 1 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Ảnh chụp màn hình">
          {screenshots.map((shot, index) => (
            <li key={`${shot.url}-${index}`}>
              <button
                ref={(el) => {
                  thumbRefs.current[index] = el
                }}
                type="button"
                onClick={() => openAt(index)}
                aria-label={`Xem ảnh ${index + 1}/${count}${shot.caption ? `: ${shot.caption}` : ''}`}
                aria-current={index === active ? 'true' : undefined}
                className={cn(
                  'bg-muted focus-visible:ring-ring/50 relative block aspect-[16/10] w-full overflow-hidden rounded-lg border-2 transition-[border-color,opacity] duration-150 outline-none focus-visible:ring-3',
                  index === active
                    ? 'border-primary'
                    : 'border-transparent opacity-80 hover:opacity-100'
                )}
              >
                <DemoImage
                  src={shot.url}
                  alt=""
                  sizes="160px"
                  eager
                  highPriority={false}
                  fallback={fallback}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/90" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col outline-none"
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                go(1)
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault()
                go(-1)
              }
            }}
            onCloseAutoFocus={(event) => {
              // Trả focus về ảnh nhỏ của ảnh đang xem (hoặc ảnh lớn khi chỉ có 1 ảnh)
              event.preventDefault()
              ;(thumbRefs.current[active] ?? mainRef.current)?.focus()
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 text-white">
              <DialogPrimitive.Title className="min-w-0 truncate text-sm font-medium">
                {name}
                <span className="text-white/70">
                  {' '}
                  · Ảnh {active + 1}/{count}
                </span>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Dùng phím mũi tên trái, phải hoặc vuốt ngang để chuyển ảnh; phím Esc để đóng.
              </DialogPrimitive.Description>
              <DialogPrimitive.Close
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/60"
                aria-label="Đóng"
              >
                <X className="size-5" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>

            <div
              className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 select-none sm:px-20"
              onPointerDown={(event) => {
                swipeStart.current = { x: event.clientX, y: event.clientY }
              }}
              onPointerUp={(event) => {
                const start = swipeStart.current
                swipeStart.current = null
                if (!start || count < 2) return
                const dx = event.clientX - start.x
                const dy = event.clientY - start.y
                if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy))
                  go(dx < 0 ? 1 : -1)
              }}
              onPointerCancel={() => {
                swipeStart.current = null
              }}
            >
              <div className="relative h-full max-h-[calc(100dvh-10rem)] w-full max-w-6xl">
                <DemoImage
                  key={current.url}
                  src={current.url}
                  alt={altOf(name, current, active)}
                  sizes="100vw"
                  eager
                  className="bg-transparent"
                  imageClassName="object-contain object-center"
                  fallback={fallback}
                />
              </div>

              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Ảnh trước"
                    className="absolute top-1/2 left-2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/60 sm:left-4 sm:flex"
                  >
                    <ChevronLeft className="size-6" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Ảnh sau"
                    className="absolute top-1/2 right-2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/60 sm:right-4 sm:flex"
                  >
                    <ChevronRight className="size-6" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
              {count > 1 && (
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Ảnh trước"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 outline-none focus-visible:ring-3 focus-visible:ring-white/60 sm:hidden"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
              )}
              <p
                className="min-h-5 flex-1 text-center text-sm text-pretty text-white/90"
                aria-live="polite"
              >
                {current.caption || `Ảnh ${active + 1}`}
              </p>
              {count > 1 && (
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Ảnh sau"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 outline-none focus-visible:ring-3 focus-visible:ring-white/60 sm:hidden"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
