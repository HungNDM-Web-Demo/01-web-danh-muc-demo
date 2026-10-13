import { cn } from '@/lib/utils'
import { IndustryIcon } from './IndustryIcon'
import { industryClass, industryVars } from './industry-style'

type IndustryBadgeProps = {
  name: string
  color: string
  icon?: string | null
  size?: 'sm' | 'md'
  className?: string
}

/** Nhãn nhóm ngành: nền nhạt 12% + chữ màu nhóm đậm (08-THIET-KE-GIAO-DIEN §2). */
export function IndustryBadge({ name, color, icon, size = 'sm', className }: IndustryBadgeProps) {
  return (
    <span
      style={industryVars(color)}
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        size === 'sm' ? 'h-6 px-2.5 text-xs' : 'h-7 px-3 text-[0.8125rem]',
        industryClass.badge,
        className
      )}
    >
      {icon !== undefined && (
        <IndustryIcon iconName={icon} className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      )}
      {name}
    </span>
  )
}
