import { ChartColumn, ExternalLink, LayoutGrid, Tags } from 'lucide-react'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import type { NavGroup } from './index'

/**
 * Menu chính của Danh mục Demo (08-THIET-KE-GIAO-DIEN §5).
 * Thẻ tổng hợp đầu trang Quản lý demo thay cho trang Tổng quan (02-SRS §2.4), nên không có mục Tổng quan.
 */
export const mainRoutes: NavGroup = {
  id: 'main',
  items: [
    {
      title: 'Quản lý demo',
      href: routePath.adminDemos,
      icon: LayoutGrid,
      permission: permissions.demos.view,
      description: 'Thẻ tổng hợp, trạng thái, hiển thị, nổi bật, thứ tự',
    },
    {
      title: 'Nhóm ngành',
      href: routePath.adminCategories,
      icon: Tags,
      permission: permissions.industries.view,
      description: 'Nhóm ngành dùng để lọc demo trên danh mục',
    },
    {
      title: 'Thống kê',
      href: routePath.adminReports,
      icon: ChartColumn,
      permission: permissions.reports.view,
      description: 'Lượt xem, lượt mở demo theo ngày, nhóm ngành, thiết bị',
    },
    {
      title: 'Xem trang công khai',
      href: routePath.catalog,
      icon: ExternalLink,
      newTab: true,
      description: 'Mở trang danh mục khách đang thấy',
    },
  ],
}
