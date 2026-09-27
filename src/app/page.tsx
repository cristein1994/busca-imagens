import { Suspense } from 'react'
import { SearchDesk } from '@/components/SearchDesk'

export default function HomePage() {
  return (
    <Suspense fallback={<main className="px-4 py-16 font-mono text-sm text-mist sm:px-8">A carregar a mesa de busca…</main>}>
      <SearchDesk />
    </Suspense>
  )
}
