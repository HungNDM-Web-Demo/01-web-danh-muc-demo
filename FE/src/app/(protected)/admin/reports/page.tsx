import type { Metadata } from 'next'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'

export const metadata: Metadata = { title: 'Thống kê' }

export default function Page() {
  return <ReportsPage />
}
