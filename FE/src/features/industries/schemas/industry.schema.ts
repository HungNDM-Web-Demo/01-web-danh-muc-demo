import { z } from 'zod'
import {
  INDUSTRY_COLOR_MESSAGE,
  INDUSTRY_COLOR_PATTERN,
  INDUSTRY_SLUG_MESSAGE,
  INDUSTRY_SLUG_PATTERN,
} from '../lib/industry-rules'
import type { Industry, SaveIndustryRequest } from '../types/industry.types'

/** Form nhóm ngành (FR-25, BR-13). Trùng mã, trùng slug do API báo tại ô. */
export const industryFormSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, 'Mã nhóm là số từ 1 đến 99')
    .refine((v) => Number(v) >= 1, 'Mã nhóm là số từ 1 đến 99'),
  name: z.string().trim().min(1, 'Nhập tên nhóm ngành').max(60, 'Tên nhóm tối đa 60 ký tự'),
  slug: z.string().trim().regex(INDUSTRY_SLUG_PATTERN, INDUSTRY_SLUG_MESSAGE),
  icon: z.string(),
  color: z.string().trim().regex(INDUSTRY_COLOR_PATTERN, INDUSTRY_COLOR_MESSAGE),
  description: z.string().trim().max(300, 'Mô tả tối đa 300 ký tự'),
})

export type IndustryFormValues = {
  code: string
  name: string
  slug: string
  icon: string
  color: string
  description: string
}

export const toIndustryForm = (industry: Industry | null, nextCode: number): IndustryFormValues =>
  industry
    ? {
        code: String(industry.code),
        name: industry.name,
        slug: industry.slug,
        icon: industry.icon ?? '',
        color: industry.color,
        description: industry.description ?? '',
      }
    : {
        code: String(nextCode),
        name: '',
        slug: '',
        icon: 'Shapes',
        color: '#475569',
        description: '',
      }

export const toSaveIndustryRequest = (values: IndustryFormValues): SaveIndustryRequest => ({
  code: Number(values.code),
  name: values.name.trim(),
  slug: values.slug.trim(),
  icon: values.icon || null,
  color: values.color.trim().toUpperCase(),
  description: values.description.trim() || null,
})
