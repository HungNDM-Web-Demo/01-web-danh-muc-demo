import type { Metadata } from 'next'
import { DemoEditorPage } from '@/features/demos/pages/DemoEditorPage'

export const metadata: Metadata = { title: 'Thêm demo' }

export default function Page() {
  return <DemoEditorPage />
}
