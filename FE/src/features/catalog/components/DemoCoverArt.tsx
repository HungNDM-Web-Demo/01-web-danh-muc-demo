import { IndustryIcon } from '@/features/industries/components/IndustryIcon'
import { industryVars } from '@/features/industries/components/industry-style'
import { cn } from '@/lib/utils'

type DemoCoverArtProps = {
  name: string
  color: string
  icon?: string | null
  /** Ẩn tên (vd ảnh nhỏ 64×40 trong bảng quản trị) */
  hideName?: boolean
  className?: string
}

/**
 * Ảnh mặc định của demo chưa có ảnh chụp (BR-07, 08-THIET-KE-GIAO-DIEN §3):
 * gradient từ màu nhóm (đậm, góc trái dưới) sang màu nhóm pha trắng 70%, icon nhóm lớn mờ bên phải,
 * tên demo chữ trắng đậm ở góc trái dưới. Vẽ bằng CSS, không cần file ảnh. Lấp đầy khung cha (relative).
 */
export function DemoCoverArt({ name, color, icon, hideName, className }: DemoCoverArtProps) {
  return (
    <div
      role="img"
      aria-label={`Ảnh minh họa ${name}`}
      style={{
        ...industryVars(color),
        backgroundImage:
          'linear-gradient(to top right, color-mix(in srgb, var(--ind) 78%, black) 0%, var(--ind) 42%, color-mix(in srgb, var(--ind) 30%, white) 100%)',
      }}
      className={cn('@container absolute inset-0 overflow-hidden', className)}
    >
      {/* Vệt sáng trang trí */}
      <span
        aria-hidden="true"
        className="absolute -top-1/3 -left-1/4 size-[70%] rounded-full bg-white/15 blur-2xl"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.12]"
      />
      <IndustryIcon
        iconName={icon}
        strokeWidth={1.4}
        className="absolute top-1/2 -right-[6%] size-[62%] -translate-y-1/2 -rotate-12 text-white/25"
      />
      {!hideName && (
        <span className="absolute inset-x-0 bottom-0 p-4 @xs:p-5 @md:p-8">
          <span className="line-clamp-2 text-lg leading-tight font-bold tracking-tight text-balance text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.25)] @xs:text-xl @md:text-3xl @2xl:text-4xl">
            {name}
          </span>
        </span>
      )}
    </div>
  )
}
