import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { Roster } from '@/components/Roster'

export const metadata: Metadata = {
  title: 'Quadro LabFert · AgentEngine',
  description: 'Quadro profissional da LabFert organizado a partir da planilha e das unidades publicadas no site.',
}

export default function LabfertPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8">
        <Nav current="labfert" />
      </div>
      <Roster />
    </>
  )
}
