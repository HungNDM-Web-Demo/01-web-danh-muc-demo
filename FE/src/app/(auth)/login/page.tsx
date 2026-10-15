import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { appConfig } from '@/config/app.config'
import { LoginPage } from '@/features/auth/pages/LoginPage'

export const metadata: Metadata = { title: 'Đăng nhập' }

export default function Page() {
  if (appConfig.publicOnly) redirect('/')
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}
