import { PublicLayout, publicLayoutMetadata } from '@/features/catalog/components/PublicLayout'

/**
 * Trang chi tiết demo (SCR-02), cùng khung công khai với trang danh mục. Đặt ngoài nhóm (public)
 * để ảnh chia sẻ có đường dẫn gọn /demos/{slug}/opengraph-image (route trong nhóm bị thêm hậu tố).
 */
export const generateMetadata = publicLayoutMetadata

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}
