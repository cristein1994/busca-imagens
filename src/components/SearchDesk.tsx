'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { loadCases, subscribeCases, upsertCase } from '@/lib/cases'
import { downloadJson } from '@/lib/text'
import { QUERY_KINDS, type QueryKind, type SavedCase, type SearchResponse } from '@/lib/types'
import { ModuleCard } from './ModuleCard'

const EXAMPLES = [
  ['example.com', 'domínio'],
  ['1.1.1.1', 'IP'],
  ['torvalds', 'usuário'],
  ['/sur linux kernel', 'surface'],
  ['/deep linux', 'deep'],
] as const

type KindChoice = QueryKind | 'auto'

const KIND_TEXT: Record<QueryKind, string> = {
  ip: 'IP',
  url: 'URL',
  email: 'E-mail',
  username: 'Usuário',
  phone: 'Telefone',
  domain: 'Domínio',
  keyword: 'Termo',
  surface: 'Surface',
  deep: 'Deep',
}

const KIND_OPTIONS: Array<{ id: KindChoice; label: string }> = [
  { id: 'auto', label: 'Auto' },
  ...QUERY_KINDS.map((id) => ({ id, label: KIND_TEXT[id] })),
]

export function SearchDesk() {
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindChoice>('auto')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [fromCase, setFromCase] = useState<SavedCase | null>(null)
  const [saved, setSaved] = useState(false)
  const [cases, setCases] = useState<SavedCase[]>([])

  useEffect(() => {
    const sync = () => setCases(loadCases())
    sync()
    return subscribeCases(sync)
  }, [])

  useEffect(() => {
    const id = params.get('caso')
    if (!id) return
    const found = loadCases().find((item) => item.id === id)
    if (!found) return
    setFromCase(found)
    setResult(found.snapshot)
    setQuery(found.query)
    setKind(found.kind)
    setTitle(found.title)
    setNotes(found.notes)
    setStatus('done')
    setSaved(false)
    setError('')
  }, [params])

  const withData = useMemo(
    () => result?.modules.filter((module) => module.status === 'ok').length ?? 0,
    [result],
  )

  async function search(nextQuery = query, nextKind = kind) {
    const term = nextQuery.trim()
    if (term.length < 2) {
      setError('Informe pelo menos 2 caracteres.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    setSaved(false)
    setFromCase(null)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: term,
          kind: nextKind === 'auto' ? undefined : nextKind,
        }),
      })
      const data = (await response.json()) as SearchResponse & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Falha na busca.')
      setResult(data)
      setTitle(data.normalized)
      setNotes('')
      setStatus('done')
      if (params.get('caso')) router.replace('/')
    } catch (err) {
      setResult(null)
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Falha na busca.')
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void search()
  }

  function saveCase() {
    if (!result) return
    const now = new Date().toISOString()
    const item: SavedCase = {
      id: fromCase?.id ?? crypto.randomUUID(),
      title: title.trim() || result.normalized,
      query: result.query,
      kind: result.kind,
      kindLabel: result.kindLabel,
      notes,
      createdAt: fromCase?.createdAt ?? now,
      updatedAt: now,
      snapshot: result,
    }
    upsertCase(item)
    setFromCase(item)
    setSaved(true)
  }

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <section className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-acid">Fontes públicas</p>
        <h1 className="mt-2 text-4xl leading-none text-foam sm:text-5xl">Procure um rasto público.</h1>
        <p className="mt-3 max-w-xl text-mist">
          Domínio, IP, e-mail, usuário, URL ou termo. <span className="text-foam">/sur termo</span> procura a surface web. <span className="text-foam">/deep termo</span> varre mais de 30 diretórios de dados e fóruns públicos.
        </p>
      </section>

      <form onSubmit={onSubmit} className="mt-8 border border-line bg-panel/80 p-4 sm:p-5">
        <label htmlFor="q" className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist">
          Consulta
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="example.com, /sur termo, /deep termo…"
            maxLength={180}
            className="min-w-0 flex-1 border border-line bg-ink px-3 py-3 font-mono text-sm text-foam outline-none placeholder:text-mist/70"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-acid px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink disabled:opacity-50"
          >
            {status === 'loading' ? 'A procurar…' : 'Buscar'}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Tipo de busca">
          {KIND_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={kind === option.id}
              onClick={() => setKind(option.id)}
              className={`border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                kind === option.id ? 'border-acid bg-acid text-ink' : 'border-line text-mist hover:text-foam'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map(([sample, hint]) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQuery(sample)
                setKind('auto')
                void search(sample, 'auto')
              }}
              className="border border-line px-2 py-1 font-mono text-[11px] text-mist hover:border-acid hover:text-foam"
            >
              {sample}
              <span className="ml-2 text-acid/80">{hint}</span>
            </button>
          ))}
        </div>
      </form>

      {status === 'idle' ? (
        <div className="mt-16 text-center">
          <div className="radar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-mist">À espera de uma consulta</p>
        </div>
      ) : null}

      {status === 'loading' ? (
        <p className="mt-8 font-mono text-sm text-acid" role="status">
          A consultar fontes públicas…
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-8 border border-rose/50 bg-panel px-4 py-3 text-rose" role="alert">
          {error}
        </div>
      ) : null}

      {status === 'done' && result ? (
        <section className="mt-8" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-acid">{result.kindLabel}</p>
              <h2 className="text-2xl text-foam">{result.normalized}</h2>
              <p className="mt-1 font-mono text-xs text-mist">
                {withData} de {result.modules.length} fontes com dados · {result.tookMs} ms
                {fromCase ? ' · caso guardado' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadJson(`orbe-${result.kind}.json`, result)}
              className="border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foam hover:border-acid"
            >
              Exportar JSON
            </button>
          </div>

          <div className="mt-4 grid gap-3 border border-line bg-panel/70 p-4 lg:grid-cols-[1fr_1.4fr_auto]">
            <label className="block text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist">Título do caso</span>
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setSaved(false)
                }}
                className="mt-1 w-full border border-line bg-ink px-2 py-2 font-mono text-sm text-foam outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist">Notas</span>
              <input
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value)
                  setSaved(false)
                }}
                placeholder="O que este rasto significa"
                className="mt-1 w-full border border-line bg-ink px-2 py-2 font-mono text-sm text-foam outline-none placeholder:text-mist/60"
              />
            </label>
            <button
              type="button"
              onClick={saveCase}
              className="self-end border border-acid px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-acid hover:bg-acid hover:text-ink"
            >
              {saved ? 'Guardado' : fromCase ? 'Atualizar caso' : 'Guardar caso'}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {result.modules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      ) : null}

      {cases.length > 0 && status !== 'loading' ? (
        <aside className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist">Casos recentes</h2>
            <Link href="/casos" className="font-mono text-[11px] uppercase tracking-[0.14em] text-acid">
              Abrir arquivo
            </Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {cases.slice(0, 4).map((item) => (
              <li key={item.id}>
                <Link href={`/?caso=${item.id}`} className="block border border-line bg-panel/60 px-3 py-3 hover:border-acid">
                  <span className="block text-foam">{item.title}</span>
                  <span className="font-mono text-[11px] text-mist">
                    {item.kindLabel} · {item.query}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </main>
  )
}
