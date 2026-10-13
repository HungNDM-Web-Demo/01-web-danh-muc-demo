import { appConfig } from '@/config/app.config'
import { settingKeys, type PublicSettings } from '@/features/settings/types/setting.types'
import { formatPhone } from '@/lib/format'

/** Thông tin công ty trên trang công khai, lấy từ cài đặt chung Brand.*, Company.* (FR-05). */
export type PublicBrand = {
  appName: string
  logoUrl: string
  companyName: string
  hotline: string
  /** Hotline đã định dạng "0123 456 789" */
  hotlineDisplay: string
  /** tel:0123456789, rỗng khi chưa có hotline */
  hotlineHref: string
  zaloHref: string
  email: string
  address: string
  website: string
}

const digits = (value: string) => value.replace(/[^\d+]/g, '')

/** "0123 456 789" → "tel:0123456789" (bấm trên điện thoại là gọi ngay) */
export const telHref = (phone: string) => (digits(phone) ? `tel:${digits(phone)}` : '')

/** Số Zalo hoặc link https://zalo.me/... */
export function zaloHref(value: string): string {
  const text = value.trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  const phone = digits(text).replace(/^\+?84/, '0')
  return phone ? `https://zalo.me/${phone}` : ''
}

export function toPublicBrand(settings: PublicSettings | undefined): PublicBrand {
  const get = (key: string) => settings?.[key]?.trim() ?? ''
  const hotline = get(settingKeys.companyHotline)
  return {
    appName: get(settingKeys.appName) || appConfig.name,
    logoUrl: get(settingKeys.logoUrl),
    companyName: get(settingKeys.companyName) || get(settingKeys.appName) || appConfig.name,
    hotline,
    hotlineDisplay: hotline ? formatPhone(hotline) : '',
    hotlineHref: telHref(hotline),
    zaloHref: zaloHref(get(settingKeys.companyZalo)),
    email: get(settingKeys.companyEmail),
    address: get(settingKeys.companyAddress),
    website: get(settingKeys.companyWebsite),
  }
}
