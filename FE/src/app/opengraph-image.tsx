import { OG_SIZE, renderOgImage } from '@/features/catalog/services/og-image.server'
import { getPublicSettingsServer } from '@/features/settings/services/setting.server'

export const alt = 'Danh mục demo phần mềm'
export const size = OG_SIZE
export const contentType = 'image/png'

/** Ảnh chia sẻ trang danh mục (gửi link danh mục qua Zalo vẫn có ảnh xem trước). */
export default async function Image() {
  const settings = await getPublicSettingsServer()
  return renderOgImage({
    title: 'Giải pháp phần mềm doanh nghiệp và đồ án sinh viên',
    description: 'Xem trước các sản phẩm mẫu theo ngành, mở demo chạy thật ngay trên điện thoại.',
    tag: settings['Brand.AppName'] || 'Danh mục Demo',
    color: settings['Brand.PrimaryColor'] || '#2563EB',
    footer: settings['Company.Name'] || 'Danh mục Demo',
  })
}
