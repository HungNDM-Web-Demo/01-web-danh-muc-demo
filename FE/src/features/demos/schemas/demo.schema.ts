import { z } from 'zod'
import { USERNAME_MESSAGE, USERNAME_PATTERN } from '@/lib/validators'
import {
  PROJECT_CODE_MESSAGE,
  PROJECT_CODE_PATTERN,
  SLUG_MESSAGE,
  SLUG_PATTERN,
  URL_MESSAGE,
  demoLimits,
  isValidHttpUrl,
} from '../lib/demo-rules'
import type { DemoDetail, SaveDemoRequest } from '../types/demo.types'

/** Giá trị form thêm/sửa demo (SCR-06). Ô số và ô chữ giữ dạng chuỗi để hiện đúng lỗi dưới ô. */
export type DemoFormValues = {
  number: string
  projectCode: string
  name: string
  slug: string
  industryId: string
  ideaCode: string
  targetCustomers: string
  problemSolved: string
  productType: string
  devices: string
  shortDescription: string
  description: string
  features: { value: string }[]
  keywords: string[]
  demoUrl: string
  swaggerUrl: string
  repoUrl: string
  ownerName: string
  requiresLogin: boolean
  demoPassword: string
  internalNotes: string
  demoScript: string
  accounts: { username: string; roleName: string; purpose: string }[]
  faqs: { question: string; answer: string }[]
}

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} tối đa ${max} ký tự`)

const optionalUrl = z
  .string()
  .trim()
  .max(300, 'Link tối đa 300 ký tự')
  .refine((v) => !v || isValidHttpUrl(v), URL_MESSAGE)

/**
 * Kiểm tra form theo BR-05 (slug), BR-08 (độ dài), BR-09 (mã dự án, số thứ tự), BR-16 (tài khoản demo).
 * Trùng mã, trùng slug, trùng số thứ tự do API báo (gắn vào ô bằng applyFieldErrors).
 */
export function demoFormSchema(mode: 'create' | 'edit') {
  return z.object({
    number: z
      .string()
      .trim()
      .regex(/^\d{1,2}$/, 'Số thứ tự là số từ 1 đến 99')
      .refine((v) => Number(v) >= 1 && Number(v) <= 99, 'Số thứ tự là số từ 1 đến 99'),
    projectCode:
      mode === 'create'
        ? z.string().trim().regex(PROJECT_CODE_PATTERN, PROJECT_CODE_MESSAGE)
        : z.string(),
    name: z
      .string()
      .trim()
      .min(1, 'Nhập tên demo')
      .max(demoLimits.nameMax, `Tên tối đa ${demoLimits.nameMax} ký tự`),
    slug: z.string().trim().regex(SLUG_PATTERN, SLUG_MESSAGE),
    industryId: z.string().min(1, 'Chọn nhóm ngành'),
    ideaCode: optionalText(10, 'Mã ý tưởng'),
    targetCustomers: optionalText(300, 'Đối tượng khách hàng'),
    problemSolved: optionalText(1000, 'Vấn đề giải quyết'),
    productType: optionalText(150, 'Loại sản phẩm'),
    devices: optionalText(150, 'Thiết bị'),
    shortDescription: z
      .string()
      .trim()
      .superRefine((v, ctx) => {
        if (
          v &&
          (v.length < demoLimits.shortDescriptionMin || v.length > demoLimits.shortDescriptionMax)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: `Mô tả ngắn cần dài ${demoLimits.shortDescriptionMin}–${demoLimits.shortDescriptionMax} ký tự (hiện có ${v.length})`,
          })
        }
      }),
    description: optionalText(5000, 'Mô tả chi tiết'),
    features: z
      .array(
        z.object({
          value: z
            .string()
            .trim()
            .min(1, 'Nhập tính năng hoặc xóa dòng trống')
            .max(demoLimits.featureMax, `Mỗi tính năng tối đa ${demoLimits.featureMax} ký tự`),
        })
      )
      .max(demoLimits.featuresMax, `Tối đa ${demoLimits.featuresMax} tính năng nổi bật`),
    keywords: z
      .array(z.string())
      .max(demoLimits.keywordsMax, `Tối đa ${demoLimits.keywordsMax} từ khóa`),
    demoUrl: optionalUrl,
    swaggerUrl: optionalUrl,
    repoUrl: optionalUrl,
    ownerName: optionalText(100, 'Người phụ trách'),
    requiresLogin: z.boolean(),
    demoPassword: optionalText(100, 'Mật khẩu demo'),
    internalNotes: optionalText(demoLimits.internalNotesMax, 'Ghi chú nội bộ'),
    demoScript: optionalText(5000, 'Kịch bản'),
    accounts: z
      .array(
        z.object({
          username: z.string().trim().toLowerCase().regex(USERNAME_PATTERN, USERNAME_MESSAGE),
          roleName: z
            .string()
            .trim()
            .min(1, 'Nhập tên vai trò')
            .max(60, 'Tên vai trò tối đa 60 ký tự'),
          purpose: optionalText(200, 'Mô tả'),
        })
      )
      .max(demoLimits.accountsMax, `Mỗi demo tối đa ${demoLimits.accountsMax} tài khoản demo`)
      .superRefine((accounts, ctx) => {
        const seen = new Map<string, number>()
        accounts.forEach((account, index) => {
          const key = account.username.trim().toLowerCase()
          if (key && seen.has(key)) {
            ctx.addIssue({
              code: 'custom',
              path: [index, 'username'],
              message: 'Tên đăng nhập bị trùng trong demo này',
            })
          }
          seen.set(key, index)
        })
      }),
    faqs: z.array(
      z.object({
        question: z.string().trim().min(1, 'Nhập câu hỏi').max(300, 'Câu hỏi tối đa 300 ký tự'),
        answer: z
          .string()
          .trim()
          .min(1, 'Nhập câu trả lời gợi ý')
          .max(1000, 'Câu trả lời tối đa 1000 ký tự'),
      })
    ),
  })
}

export const emptyDemoForm = (): DemoFormValues => ({
  number: '',
  projectCode: '',
  name: '',
  slug: '',
  industryId: '',
  ideaCode: '',
  targetCustomers: '',
  problemSolved: '',
  productType: '',
  devices: '',
  shortDescription: '',
  description: '',
  features: [],
  keywords: [],
  demoUrl: '',
  swaggerUrl: '',
  repoUrl: '',
  ownerName: '',
  requiresLogin: true,
  demoPassword: '',
  internalNotes: '',
  demoScript: '',
  accounts: [],
  faqs: [],
})

/** DemoDetail (API) → giá trị form */
export function toDemoForm(detail: DemoDetail): DemoFormValues {
  return {
    number: String(detail.number),
    projectCode: detail.projectCode,
    name: detail.name,
    slug: detail.slug,
    industryId: detail.industryId,
    ideaCode: detail.ideaCode ?? '',
    targetCustomers: detail.targetCustomers ?? '',
    problemSolved: detail.problemSolved ?? '',
    productType: detail.productType ?? '',
    devices: detail.devices ?? '',
    shortDescription: detail.shortDescription ?? '',
    description: detail.description ?? '',
    features: detail.features.map((value) => ({ value })),
    keywords: [...detail.keywords],
    demoUrl: detail.demoUrl ?? '',
    swaggerUrl: detail.internal?.swaggerUrl ?? '',
    repoUrl: detail.internal?.repoUrl ?? '',
    ownerName: detail.internal?.ownerName ?? '',
    requiresLogin: detail.requiresLogin,
    demoPassword: detail.internal?.demoPassword ?? '',
    internalNotes: detail.internal?.internalNotes ?? '',
    demoScript: detail.internal?.demoScript ?? '',
    accounts: detail.accounts.map((a) => ({
      username: a.username,
      roleName: a.roleName,
      purpose: a.purpose ?? '',
    })),
    faqs: (detail.internal?.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
  }
}

const nullIfBlank = (value: string) => (value.trim() ? value.trim() : null)

/** Giá trị form → SaveDemoRequest (07-DANH-SACH-API §3) */
export function toSaveDemoRequest(values: DemoFormValues): SaveDemoRequest {
  return {
    number: Number(values.number),
    projectCode: values.projectCode.trim(),
    name: values.name.trim(),
    slug: values.slug.trim(),
    industryId: values.industryId,
    ideaCode: nullIfBlank(values.ideaCode),
    targetCustomers: nullIfBlank(values.targetCustomers),
    problemSolved: nullIfBlank(values.problemSolved),
    productType: nullIfBlank(values.productType),
    devices: nullIfBlank(values.devices),
    shortDescription: nullIfBlank(values.shortDescription),
    description: nullIfBlank(values.description),
    features: values.features.map((f) => f.value.trim()).filter(Boolean),
    keywords: values.keywords.map((k) => k.trim()).filter(Boolean),
    demoUrl: nullIfBlank(values.demoUrl),
    swaggerUrl: nullIfBlank(values.swaggerUrl),
    repoUrl: nullIfBlank(values.repoUrl),
    ownerName: nullIfBlank(values.ownerName),
    requiresLogin: values.requiresLogin,
    demoPassword: nullIfBlank(values.demoPassword),
    internalNotes: nullIfBlank(values.internalNotes),
    demoScript: nullIfBlank(values.demoScript),
    accounts: values.accounts.map((a) => ({
      username: a.username.trim().toLowerCase(),
      roleName: a.roleName.trim(),
      purpose: nullIfBlank(a.purpose),
    })),
    faqs: values.faqs.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })),
  }
}
