import type { Metadata } from 'next'
import { IBM_Plex_Mono, Syne } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
})

const plex = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex',
})

export const metadata: Metadata = {
  title: 'ORBE — motor de busca OSINT',
  description:
    'Pesquisa em fontes públicas: DNS, RDAP, certificados, arquivo web, perfis e enciclopédias.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${syne.variable} ${plex.variable} antialiased`}>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-acid focus:px-3 focus:py-2 focus:text-ink"
        >
          Saltar para o conteúdo
        </a>
        <div className="min-h-screen">
          <SiteHeader />
          {children}
          <footer className="mx-auto max-w-6xl px-4 py-8 font-mono text-[11px] leading-relaxed text-mist sm:px-8">
            ORBE consulta fontes públicas (DNS, RDAP, certificados, arquivo web, perfis e enciclopédias).
            Não acede a contas, credenciais ou bases privadas.
          </footer>
        </div>
      </body>
    </html>
  )
}
