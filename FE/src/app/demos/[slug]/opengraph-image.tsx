import { getPublicDemoServer } from '@/features/catalog/services/catalog.server'
import { OG_SIZE, renderOgImage } from '@/features/catalog/services/og-image.server'
import { getPublicSettingsServer } from '@/features/settings/services/setting.server'

export const alt = 'Ảnh giới thiệu demo'
export const size = OG_SIZE
export const contentType = 'image/png'

/** FR-10: ảnh chia sẻ 1200×630 lấy từ tên, mô tả ngắn, ảnh đại diện, màu nhóm ngành của demo. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [lookup, settings] = await Promise.all([
    getPublicDemoServer(slug),
    getPublicSettingsServer(),
  ])
  const demo = lookup?.demo
  const footer = settings['Company.Name'] || settings['Brand.AppName'] || 'Danh mục Demo'
  if (!demo) {
    return renderOgImage({
      title: 'Danh mục demo phần mềm',
      description: null,
      color: '#2563EB',
      footer,
    })
  }
  return renderOgImage({
    title: demo.name,
    description: demo.shortDescription,
    tag: demo.industry.name,
    color: demo.industry.color,
    coverUrl: demo.coverUrl,
    footer,
  })
}
