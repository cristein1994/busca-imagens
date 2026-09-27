'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadCases, subscribeCases } from '@/lib/cases'

export function SiteHeader() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const sync = () => setCount(loadCases().length)
    sync()
    return subscribeCases(sync)
  }, [])

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line/80 px-4 py-4 sm:px-8">
      <Link href="/" className="min-w-0">
        <span className="block text-xl tracking-[0.28em] text-acid">ORBE</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist">
          motor de busca OSINT
        </span>
      </Link>
      <nav>
        <Link
          href="/casos"
          className="inline-block border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foam hover:border-acid hover:text-acid"
        >
          Casos{count ? ` · ${count}` : ''}
        </Link>
      </nav>
    </header>
  )
}
