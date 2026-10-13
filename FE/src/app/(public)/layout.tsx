import { PublicLayout, publicLayoutMetadata } from '@/features/catalog/components/PublicLayout'

/** Trang danh mục "/" (SCR-01). Trang chi tiết dùng cùng khung ở app/demos/layout.tsx. */
export const generateMetadata = publicLayoutMetadata

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}
