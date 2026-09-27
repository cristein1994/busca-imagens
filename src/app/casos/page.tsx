import type { Metadata } from 'next'
import { CaseArchive } from '@/components/CaseArchive'

export const metadata: Metadata = {
  title: 'Casos — ORBE',
  description: 'Casos OSINT guardados neste navegador.',
}

export default function CasosPage() {
  return <CaseArchive />
}
