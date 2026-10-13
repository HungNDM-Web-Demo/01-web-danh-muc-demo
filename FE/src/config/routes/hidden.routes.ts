import { CirclePlus, UserRound } from 'lucide-react'
import { permissions } from '@/config/permissions'
import { routePath } from '@/config/route-path'
import type { NavItem } from './index'

/** Trang không nằm trong menu nhưng cần tiêu đề trên Header và kiểm tra quyền. */
export const hiddenRoutes: NavItem[] = [
  {
    title: 'Hồ sơ cá nhân',
    href: routePath.profile,
    icon: UserRound,
  },
  {
    // Khớp dài hơn /admin/demos nên được ưu tiên (findRoute)
    title: 'Thêm demo',
    href: routePath.adminDemoNew,
    icon: CirclePlus,
    permission: permissions.demos.create,
  },
]
