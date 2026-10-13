import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { routeTo } from '@/config/route-path'
import { DemoDetailPage } from '@/features/catalog/pages/DemoDetailPage'
import { getPublicDemoServer } from '@/features/catalog/services/catalog.server'

type Props = { params: Promise<{ slug: string }> }

/** FR-10: tiêu đề, mô tả meta, ảnh chia sẻ (opengraph-image.tsx cùng thư mục) để link gửi Zalo, Facebook có ảnh. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const demo = (await getPublicDemoServer(slug))?.demo
  if (!demo) return { title: 'Không tìm thấy demo', robots: { index: false, follow: true } }
  const description = demo.shortDescription || `Demo ${demo.name} nhóm ngành ${demo.industry.name}.`
  const url = routeTo.demoDetail(demo.slug)
  return {
    title: demo.name,
    description,
    keywords: [...demo.keywords, demo.industry.name],
    alternates: { canonical: url },
    openGraph: { title: demo.name, description, url, type: 'website', locale: 'vi_VN' },
    twitter: { card: 'summary_large_image', title: demo.name, description },
  }
}

/**
 * SCR-02 Chi tiết demo: render sẵn phía máy chủ (NFR-04). Slug cũ chuyển hướng 301 (BR-06);
 * không có hoặc không hiển thị → trang "Không tìm thấy demo" mã 404 (FR-11).
 */
export default async function Page({ params }: Props) {
  const { slug } = await params
  const lookup = await getPublicDemoServer(slug)
  if (lookup?.redirectSlug) permanentRedirect(routeTo.demoDetail(lookup.redirectSlug))
  if (!lookup?.demo) notFound()
  return <DemoDetailPage slug={slug} initialLookup={lookup} />
}
