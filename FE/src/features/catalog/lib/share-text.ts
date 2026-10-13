import type { PublicDemoAccount } from '../types/catalog.types'

type ShareTextInput = {
  name: string
  demoUrl: string
  requiresLogin: boolean
  accounts: PublicDemoAccount[]
  /** Chỉ truyền khi người dùng tick "Kèm mật khẩu" (BR-17) */
  password?: string | null
  /** Link trang chi tiết theo địa chỉ đang mở, vd http://localhost:3101/demos/pos-quan-cafe */
  detailUrl: string
}

/**
 * Nội dung "Sao chép gửi khách" theo mẫu cố định BR-17 (02-SRS §4):
 *   {Tên demo}
 *   Xem demo: {link demo}
 *   Tài khoản: {tên đăng nhập 1} ({vai trò 1}), {tên đăng nhập 2} ({vai trò 2})…
 *   Cách vào: mở link, bấm "Đăng nhập nhanh" rồi chọn vai trò.
 *   Mật khẩu: {mật khẩu demo}        ← chỉ khi tick "Kèm mật khẩu"
 *   Giới thiệu chi tiết: {link trang chi tiết}
 * Demo tắt "Cần đăng nhập" (BR-16) thì ghi "không cần đăng nhập" thay cho dòng tài khoản.
 */
export function buildShareText(input: ShareTextInput): string {
  const lines = [input.name, `Xem demo: ${input.demoUrl}`]
  if (!input.requiresLogin) {
    lines.push('Tài khoản: không cần đăng nhập, mở link là xem được.')
  } else {
    if (input.accounts.length) {
      lines.push(
        `Tài khoản: ${input.accounts.map((a) => `${a.username} (${a.roleName})`).join(', ')}`
      )
    }
    lines.push('Cách vào: mở link, bấm "Đăng nhập nhanh" rồi chọn vai trò.')
    if (input.password) lines.push(`Mật khẩu: ${input.password}`)
  }
  lines.push(`Giới thiệu chi tiết: ${input.detailUrl}`)
  return lines.join('\n')
}
