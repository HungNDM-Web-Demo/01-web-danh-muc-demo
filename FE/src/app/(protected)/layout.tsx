import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shared/AppShell'
import { appConfig } from '@/config/app.config'
import { AuthGuard } from '@/features/auth/components/AuthGuard'

/** Khu vực cần đăng nhập: sidebar + header + thanh công cụ demo (KIEN-TRUC-HE-THONG §6.4). */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (appConfig.publicOnly) redirect('/')
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
