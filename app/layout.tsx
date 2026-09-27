import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgentEngine OSINT',
  description: 'Busca OSINT na superfície e no índice dark web, com resumo e Tor via systemctl.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
