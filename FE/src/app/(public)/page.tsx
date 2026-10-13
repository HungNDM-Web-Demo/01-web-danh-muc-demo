import type { Metadata } from 'next'
import { CatalogPage } from '@/features/catalog/pages/CatalogPage'
import { getPublicDemosServer, getPublicIndustriesServer } from '@/features/catalog/services/catalog.server'
import { getPublicSettingsServer } from '@/features/settings/services/setting.server'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettingsServer()
  const company = settings['Company.Name'] || settings['Brand.AppName'] || 'Danh mục Demo'
  const title = `Danh mục demo phần mềm · ${company}`
  const description =
    'Xem trước các giải pháp phần mềm theo ngành: POS quán cafe, quản lý nhà hàng, bán lẻ, spa, nhà trọ, CRM… Mở demo chạy thật ngay trên điện thoại.'
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    openGraph: { title, description, type: 'website', url: '/', siteName: company, locale: 'vi_VN' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

/** SCR-01 Danh mục demo: dữ liệu công khai lấy phía máy chủ, áp sẵn bộ lọc trên đường dẫn (FR-04). */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const [industries, demos, params] = await Promise.all([
    getPublicIndustriesServer(),
    getPublicDemosServer(),
    searchParams,
  ])
  const nganh = first(params.nganh).trim().toLowerCase()
  return (
    <CatalogPage
      initialIndustries={industries}
      initialDemos={demos}
      initialIndustry={nganh || null}
      initialQuery={first(params.q).slice(0, 100)}
    />
  )
}
