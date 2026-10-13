/** Quy tắc nhóm ngành dùng chung cho form và handler mock (FR-25, BR-13, 02-SRS §5.3). */

/** Slug nhóm ngành: chữ thường không dấu, "-", vd fnb, ban-le */
export const INDUSTRY_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/
export const INDUSTRY_SLUG_MESSAGE =
  'Slug 1–40 ký tự, gồm chữ thường không dấu, số, dấu -, không bắt đầu hoặc kết thúc bằng -'

/** Màu nhãn dạng #RRGGBB */
export const INDUSTRY_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
export const INDUSTRY_COLOR_MESSAGE = 'Màu dạng #RRGGBB, vd #EA580C'

/** Bảng màu gợi ý: 11 màu nhóm ngành của 08-THIET-KE-GIAO-DIEN §2 */
export const INDUSTRY_COLOR_PRESETS = [
  '#EA580C',
  '#2563EB',
  '#DB2777',
  '#7C3AED',
  '#0F766E',
  '#B45309',
  '#0369A1',
  '#4F46E5',
  '#16A34A',
  '#9333EA',
  '#475569',
  '#DC2626',
] as const
