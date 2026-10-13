import { Info, KeyRound, LogIn } from 'lucide-react'
import type { PublicDemoAccount } from '../types/catalog.types'

type DemoAccountsProps = {
  requiresLogin: boolean
  accounts: PublicDemoAccount[]
}

/**
 * Bảng tài khoản demo (FR-08, BR-16): tên đăng nhập, vai trò, dùng để xem gì, kèm hướng dẫn "Đăng nhập nhanh".
 * Trang công khai không bao giờ hiện mật khẩu (BR-10). Demo tắt "Cần đăng nhập" ghi "Không cần đăng nhập".
 */
export function DemoAccounts({ requiresLogin, accounts }: DemoAccountsProps) {
  return (
    <section
      aria-labelledby="demo-accounts-title"
      className="bg-card rounded-2xl border p-5 shadow-xs"
    >
      <h2 id="demo-accounts-title" className="flex items-center gap-2 text-base font-semibold">
        <KeyRound className="text-primary size-[1.125rem]" aria-hidden="true" />
        Tài khoản demo
      </h2>

      {!requiresLogin ? (
        <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
          <LogIn className="size-4 shrink-0" aria-hidden="true" />
          Không cần đăng nhập, mở link là xem được.
        </p>
      ) : accounts.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">Tài khoản demo đang được cập nhật.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y">
            {accounts.map((account) => (
              <li
                key={account.username}
                className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-3"
              >
                <code className="text-foreground bg-muted w-fit rounded-md px-1.5 py-0.5 font-mono text-[0.8125rem] font-semibold sm:min-w-28">
                  {account.username}
                </code>
                <div className="min-w-0 text-sm">
                  <span className="font-medium">{account.roleName}</span>
                  {account.purpose && (
                    <span className="text-muted-foreground"> · {account.purpose}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="bg-primary/8 text-foreground mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm">
            <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Mở link, bấm <strong className="font-semibold">&quot;Đăng nhập nhanh&quot;</strong>{' '}
              trên trang đăng nhập rồi chọn vai trò, không cần nhập mật khẩu.
            </span>
          </p>
        </>
      )}
    </section>
  )
}
