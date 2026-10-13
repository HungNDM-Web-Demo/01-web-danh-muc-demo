import type { Metadata } from 'next'
import { DemosPage } from '@/features/demos/pages/DemosPage'

export const metadata: Metadata = { title: 'Quản lý demo' }

export default function Page() {
  return <DemosPage />
}
