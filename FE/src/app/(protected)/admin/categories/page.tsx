import type { Metadata } from 'next'
import { IndustriesPage } from '@/features/industries/pages/IndustriesPage'

export const metadata: Metadata = { title: 'Nhóm ngành' }

export default function Page() {
  return <IndustriesPage />
}
