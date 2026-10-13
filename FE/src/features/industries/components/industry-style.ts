import type { CSSProperties } from 'react'

/**
 * Màu nhóm ngành lấy từ dữ liệu (cột Color), không viết cứng trong component (08-THIET-KE-GIAO-DIEN §2).
 * Gán biến `--ind` lên phần tử rồi dùng các lớp bên dưới; chữ màu nhóm được trộn 30% đen trên nền nhạt 12%
 * để đạt tương phản ≥ 4.5:1 với cả 11 màu mẫu (chế độ tối trộn 40% trắng).
 */
export const industryVars = (color: string | null | undefined): CSSProperties =>
  ({ '--ind': color || '#475569' }) as CSSProperties

export const industryClass = {
  /** Nhãn nhóm: nền nhạt + chữ màu đậm */
  badge:
    'bg-[color-mix(in_srgb,var(--ind)_12%,transparent)] text-[color-mix(in_srgb,var(--ind)_70%,black)] ring-[color-mix(in_srgb,var(--ind)_22%,transparent)] dark:bg-[color-mix(in_srgb,var(--ind)_20%,transparent)] dark:text-[color-mix(in_srgb,var(--ind)_60%,white)]',
  /** Chữ màu nhóm trên nền sáng */
  text: 'text-[color-mix(in_srgb,var(--ind)_70%,black)] dark:text-[color-mix(in_srgb,var(--ind)_60%,white)]',
  /** Nền đặc (nút lọc đang chọn), chữ trắng đạt ≥ 4.5:1 */
  solid: 'bg-[color-mix(in_srgb,var(--ind)_72%,black)] text-white',
  /** Nền rất nhạt (ô biểu tượng) */
  soft: 'bg-[color-mix(in_srgb,var(--ind)_12%,transparent)] dark:bg-[color-mix(in_srgb,var(--ind)_22%,transparent)]',
  /** Chấm màu */
  dot: 'bg-[var(--ind)]',
} as const
