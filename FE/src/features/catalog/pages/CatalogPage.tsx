'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link2, Phone, Search, SearchX, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { SEARCH_MIN_LENGTH, matchesDemoKeyword } from '@/features/demos/lib/demo-rules'
import { usePermissions } from '@/hooks/use-permissions'
import { normalizeVi } from '@/lib/normalize'
import { DemoCard, DemoCardSkeleton } from '../components/DemoCard'
import { IndustryChips } from '../components/IndustryChips'
import { usePublicBrand } from '../hooks/use-public-brand'
import { usePublicDemos, usePublicIndustries } from '../hooks/use-catalog'
import { useVisitTracker } from '../hooks/use-visit-tracker'
import { copyText } from '../lib/clipboard'
import type { PublicDemoCard, PublicIndustry } from '../types/catalog.types'

/** NFR-03: tìm kiếm chạy sau khi ngừng gõ 300 ms */
const SEARCH_DELAY = 300
/** Số thẻ màn hình đầu tải ảnh ngay (hàng đầu ở màn hình rộng nhất) */
const EAGER_CARDS = 4

type CatalogPageProps = {
  initialIndustries: PublicIndustry[]
  initialDemos: PublicDemoCard[]
  /** Tham số ?nganh= khi mở trang (FR-04) */
  initialIndustry: string | null
  /** Tham số ?q= khi mở trang (FR-04) */
  initialQuery: string
}

/** Đường dẫn danh mục theo bộ lọc, vd "/?nganh=fnb&q=pos" (FR-04, FR-15) */
function catalogPath(industry: string | null, query: string) {
  const params = new URLSearchParams()
  if (industry) params.set('nganh', industry)
  if (query.trim()) params.set('q', query.trim())
  const search = params.toString()
  return search ? `${routePath.catalog}?${search}` : routePath.catalog
}

/**
 * SCR-01 Danh mục demo (UC-01): render sẵn phía máy chủ, trình duyệt đọc lại dữ liệu qua service.
 * Lọc nhóm ngành (FR-02, BR-13), tìm không dấu (FR-03, BR-03), ghi bộ lọc lên đường dẫn (FR-04),
 * thứ tự BR-04 do API trả sẵn, sao chép link đang lọc cho nhân viên (FR-15).
 */
export function CatalogPage({
  initialIndustries,
  initialDemos,
  initialIndustry,
  initialQuery,
}: CatalogPageProps) {
  const industriesQuery = usePublicIndustries(initialIndustries)
  const demosQuery = usePublicDemos(initialDemos)
  const industries = industriesQuery.data ?? []
  const demos = demosQuery.data
  const brand = usePublicBrand()
  const { hydrated } = useAuth()
  const { can } = usePermissions()
  const { trackOpen } = useVisitTracker()

  const [requestedIndustry, setRequestedIndustry] = useState<string | null>(initialIndustry)
  const [text, setText] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  /** Chỉ ghi đường dẫn sau khi khách thao tác (giữ nguyên link khách mở) */
  const touched = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ngừng gõ 300 ms mới lọc
  useEffect(() => {
    if (text === query) return
    const timer = setTimeout(() => setQuery(text), SEARCH_DELAY)
    return () => clearTimeout(timer)
  }, [text, query])

  // BR-13: nhóm không tồn tại hoặc không có demo hiển thị thì bỏ qua, hiển thị "Tất cả"
  const selectedIndustry = industries.some((i) => i.slug === requestedIndustry)
    ? requestedIndustry
    : null

  const normalizedQuery = normalizeVi(query)
  const tooShort = normalizeVi(text).length > 0 && normalizeVi(text).length < SEARCH_MIN_LENGTH

  const filtered = useMemo(
    () =>
      (demos ?? []).filter(
        (demo) =>
          (!selectedIndustry || demo.industry.slug === selectedIndustry) &&
          matchesDemoKeyword(demo, normalizedQuery)
      ),
    [demos, selectedIndustry, normalizedQuery]
  )

  // FR-04: ghi bộ lọc lên đường dẫn, không tải lại trang
  useEffect(() => {
    if (!touched.current) return
    const next = catalogPath(selectedIndustry, query)
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState(window.history.state, '', next)
    }
  }, [selectedIndustry, query])

  const selectIndustry = (slug: string | null) => {
    touched.current = true
    setRequestedIndustry(slug)
  }

  const changeText = (value: string) => {
    touched.current = true
    setText(value)
  }

  const clearSearch = () => {
    touched.current = true
    setText('')
    setQuery('')
    inputRef.current?.focus()
  }

  const clearFilters = () => {
    touched.current = true
    setText('')
    setQuery('')
    setRequestedIndustry(null)
  }

  const copyLink = async () => {
    const url = `${window.location.origin}${catalogPath(selectedIndustry, text)}`
    if (await copyText(url)) toast.success('Đã sao chép link', { description: url })
    else
      toast.error('Trình duyệt không cho sao chép, hãy chép thủ công đường dẫn trên thanh địa chỉ.')
  }

  const total = demos?.length ?? 0
  const loading = !demos && demosQuery.isPending
  const showShare = hydrated && can(permissions.demos.share)

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
      {/* Đầu trang: tiêu đề, mô tả, ô tìm kiếm lớn */}
      <section aria-labelledby="catalog-title" className="pt-8 pb-6 sm:pt-14 sm:pb-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-primary text-sm font-semibold tracking-wide">{brand.appName}</p>
          <h1
            id="catalog-title"
            className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl"
          >
            Giải pháp phần mềm doanh nghiệp và đồ án sinh viên
          </h1>
          <p className="text-muted-foreground text-base text-pretty sm:text-lg">
            Xem trước {total > 0 ? `${total} sản phẩm mẫu` : 'các sản phẩm mẫu'} theo từng ngành.
            Chọn ngành của bạn, mở demo và thao tác như thật, không cần cài đặt.
          </p>
        </div>

        <div className="mt-6 max-w-2xl sm:mt-8">
          <label htmlFor="catalog-search" className="sr-only">
            Tìm demo
          </label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="catalog-search"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={text}
              onChange={(e) => changeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setQuery(text)
                if (e.key === 'Escape' && text) clearSearch()
              }}
              placeholder="Tìm demo: POS, nhà trọ, spa…"
              aria-describedby="catalog-search-hint"
              className="border-input bg-card placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 h-14 w-full rounded-2xl border pr-14 pl-12 text-base shadow-[0_1px_2px_rgb(15_23_42/0.05)] transition-[box-shadow,border-color] outline-none focus-visible:ring-4 [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Xóa từ khóa"
                className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring/50 absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl outline-none focus-visible:ring-3"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <p
            id="catalog-search-hint"
            aria-live="polite"
            className="text-muted-foreground mt-2 min-h-5 text-sm"
          >
            {tooShort ? 'Nhập ít nhất 2 ký tự' : ''}
          </p>
        </div>
      </section>

      {/* Lọc nhóm ngành + kết quả */}
      <section aria-label="Danh sách demo" className="space-y-5">
        <IndustryChips
          industries={industries}
          total={total}
          selected={selectedIndustry}
          onSelect={selectIndustry}
        />

        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
          <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
            {loading ? (
              'Đang tải danh sách demo…'
            ) : (
              <>
                Tìm thấy{' '}
                <span className="text-foreground font-semibold tabular-nums">
                  {filtered.length}
                </span>{' '}
                demo
              </>
            )}
          </p>
          {showShare && (
            <Button variant="outline" className="rounded-xl" onClick={copyLink}>
              <Link2 aria-hidden="true" />
              Sao chép link
            </Button>
          )}
        </div>

        {loading ? (
          <ul
            className="grid gap-5 min-[1440px]:grid-cols-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-hidden="true"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i}>
                <DemoCardSkeleton />
              </li>
            ))}
          </ul>
        ) : filtered.length > 0 ? (
          <ul className="grid gap-5 min-[1440px]:grid-cols-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((demo, index) => (
              <li key={demo.slug}>
                <DemoCard demo={demo} eager={index < EAGER_CARDS} onOpenDemo={trackOpen} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-card flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center">
            <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
              <SearchX className="size-7" aria-hidden="true" />
            </span>
            <div className="max-w-md space-y-1.5">
              <h2 className="text-lg font-semibold">Chưa có demo phù hợp</h2>
              <p className="text-muted-foreground text-sm text-pretty">
                Thử từ khóa khác hoặc chọn nhóm ngành khác. Ngành của bạn chưa có demo? Gọi để được
                giới thiệu giải pháp gần nhất.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="h-11 rounded-xl" onClick={clearFilters}>
                <X aria-hidden="true" />
                Xóa bộ lọc
              </Button>
              {brand.hotlineHref && (
                <Button asChild variant="cta" className="h-11 rounded-xl">
                  <a href={brand.hotlineHref}>
                    <Phone aria-hidden="true" />
                    Hotline {brand.hotlineDisplay}
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
