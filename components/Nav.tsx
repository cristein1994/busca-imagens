import Link from 'next/link'

export function Nav({ current }: { current: 'busca' | 'labfert' }) {
  const item = (href: string, id: 'busca' | 'labfert', label: string) => (
    <Link
      href={href}
      className={`border px-3 py-1 ${current === id ? 'border-[var(--brass)] text-[var(--brass)]' : 'border-[var(--line)] text-[var(--muted)]'}`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="mb-4 flex gap-2 font-mono text-[11px] uppercase tracking-wider" aria-label="Seções">
      {item('/', 'busca', 'Busca')}
      {item('/labfert', 'labfert', 'Quadro LabFert')}
    </nav>
  )
}
