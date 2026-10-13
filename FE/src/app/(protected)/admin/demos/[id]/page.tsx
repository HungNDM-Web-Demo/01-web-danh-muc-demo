import type { Metadata } from 'next'
import { DemoEditorPage } from '@/features/demos/pages/DemoEditorPage'

export const metadata: Metadata = { title: 'Sửa demo' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DemoEditorPage id={id} />
}
