import { createElement } from 'react'
import {
  Baby,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CalendarCheck,
  Camera,
  Car,
  Coffee,
  Cpu,
  Dumbbell,
  Factory,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  Hotel,
  House,
  Landmark,
  Leaf,
  Megaphone,
  Music,
  Package,
  PawPrint,
  Pizza,
  Plane,
  Scissors,
  Shapes,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Store,
  Truck,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

/**
 * Biểu tượng nhóm ngành theo tên icon lucide lưu ở cột Icon (06-THIET-KE-CSDL).
 * Chỉ nhận các icon trong danh sách chọn (tránh nạp cả bộ lucide); tên lạ thì dùng Shapes.
 */
export const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingBag,
  CalendarCheck,
  GraduationCap,
  Building2,
  House,
  Truck,
  Globe,
  Smartphone,
  Bot,
  Shapes,
  Coffee,
  Pizza,
  Store,
  ShoppingCart,
  Package,
  Warehouse,
  Stethoscope,
  HeartPulse,
  Dumbbell,
  Scissors,
  Hotel,
  Plane,
  Car,
  Factory,
  Wrench,
  Landmark,
  Briefcase,
  Wallet,
  Megaphone,
  BookOpen,
  Baby,
  PawPrint,
  Music,
  Camera,
  Gamepad2,
  Shirt,
  Leaf,
  Cpu,
}

export const INDUSTRY_ICON_NAMES = Object.keys(INDUSTRY_ICONS)

export function industryIconOf(name: string | null | undefined): LucideIcon {
  return (name && INDUSTRY_ICONS[name]) || Shapes
}

export function IndustryIcon({
  iconName,
  ...props
}: { iconName?: string | null } & Omit<LucideProps, 'name'>) {
  return createElement(industryIconOf(iconName), { 'aria-hidden': true, ...props })
}
