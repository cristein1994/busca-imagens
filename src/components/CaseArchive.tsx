'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { deleteCase, loadCases, subscribeCases, upsertCase } from '@/lib/cases'
import { downloadJson, formatWhen } from '@/lib/text'
import type { SavedCase } from '@/lib/types'
import { ModuleCard } from './ModuleCard'

export function CaseArchive() {
  const [cases, setCases] = useState<SavedCase[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  useEffect(() => {
    const sync = () => {
      const next = loadCases()
      setCases(next)
      setSelectedId((current) => (current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null))
    }
    sync()
    return subscribeCases(sync)
  }, [])

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return cases
    return cases.filter((item) =>
      [item.title, item.query, item.notes, item.kindLabel].join(' ').toLowerCase().includes(needle),
    )
  }, [cases, filter])

  const selected = cases.find((item) => item.id === selectedId) ?? null

  function saveEdits(item: SavedCase, nextTitle: string, nextNotes: string) {
    upsertCase({
      ...item,
      title: nextTitle.trim() || item.query,
      notes: nextNotes,
      updatedAt: new Date().toISOString(),
    })
  }

  function remove(id: string) {
    deleteCase(id)
    setPendingDelete(null)
  }

  return (
    <main id="conteudo" className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr] sm:px-8">
      <section>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl text-foam">Casos</h1>
          <button
            type="button"
            disabled={cases.length === 0}
            onClick={() => downloadJson('orbe-casos.json', cases)}
            className="border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-foam disabled:opacity-40"
          >
            Exportar
          </button>
        </div>
        <p className="mt-2 text-sm text-mist">Guardados só neste navegador.</p>
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filtrar"
          aria-label="Filtrar casos"
          className="mt-4 w-full border border-line bg-ink px-2 py-2 font-mono text-sm text-foam outline-none placeholder:text-mist/60"
        />
        {visible.length === 0 ? (
          <p className="mt-6 text-sm text-mist">
            Nenhum caso. <Link href="/" className="text-acid">Fazer uma busca</Link>
          </p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full border px-3 py-3 text-left ${
                    item.id === selected?.id ? 'border-acid bg-panel' : 'border-line bg-panel/50 hover:border-mist'
                  }`}
                >
                  <span className="block text-foam">{item.title}</span>
                  <span className="mt-1 block font-mono text-[11px] text-mist">
                    {item.kindLabel} · {formatWhen(item.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        {!selected ? (
          <div className="border border-dashed border-line px-4 py-16 text-center text-mist">
            Escolha um caso ou volte à busca.
          </div>
        ) : (
          <CaseEditor
            key={selected.id}
            item={selected}
            pendingDelete={pendingDelete === selected.id}
            onSave={saveEdits}
            onAskDelete={() => setPendingDelete(selected.id)}
            onConfirmDelete={() => remove(selected.id)}
          />
        )}
      </section>
    </main>
  )
}

function CaseEditor({
  item,
  pendingDelete,
  onSave,
  onAskDelete,
  onConfirmDelete,
}: {
  item: SavedCase
  pendingDelete: boolean
  onSave: (item: SavedCase, title: string, notes: string) => void
  onAskDelete: () => void
  onConfirmDelete: () => void
}) {
  const [title, setTitle] = useState(item.title)
  const [notes, setNotes] = useState(item.notes)

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-acid">{item.kindLabel}</p>
      <h2 className="mt-1 text-3xl text-foam">{title || item.title}</h2>
      <p className="mt-1 font-mono text-xs text-mist">
        {item.query} · atualizado {formatWhen(item.updatedAt)}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist">Título</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full border border-line bg-ink px-2 py-2 font-mono text-sm text-foam outline-none"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist">Notas</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 w-full border border-line bg-ink px-2 py-2 font-mono text-sm text-foam outline-none"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave(item, title, notes)}
          className="bg-acid px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink"
        >
          Guardar notas
        </button>
        <Link href={`/?caso=${item.id}`} className="border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foam">
          Abrir na busca
        </Link>
        <button
          type="button"
          onClick={() => downloadJson(`orbe-caso-${item.id.slice(0, 8)}.json`, { ...item, title, notes })}
          className="border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foam"
        >
          Exportar
        </button>
        {pendingDelete ? (
          <button type="button" onClick={onConfirmDelete} className="border border-rose px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-rose">
            Confirmar apagar
          </button>
        ) : (
          <button type="button" onClick={onAskDelete} className="border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mist">
            Apagar
          </button>
        )}
      </div>
      <div className="mt-6 grid gap-4">
        {item.snapshot.modules.map((module) => (
          <ModuleCard key={`${item.id}-${module.id}`} module={module} />
        ))}
      </div>
    </div>
  )
}
