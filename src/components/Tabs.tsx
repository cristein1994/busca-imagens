import type { AppTab } from '../types/generator'

const TABS: { id: AppTab; label: string }[] = [
  { id: 'generate', label: 'Gerar' },
  { id: 'character', label: 'Personagem' },
  { id: 'edit', label: 'Editar' },
  { id: 'chat', label: 'Soul Chat' },
  { id: 'gallery', label: 'Galeria' },
]

interface TabsProps {
  active: AppTab
  onChange: (tab: AppTab) => void
}

export function Tabs({ active, onChange }: TabsProps) {
  return (
    <nav className="tabs" aria-label="Funções">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab${active === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
