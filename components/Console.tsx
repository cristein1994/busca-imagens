'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Lane, LaneFailure, LaneReport, TorStatus } from '@/lib/types'

type SearchPayload = {
  query: string
  lane: Lane
  fetchedAt: string
  tor: TorStatus
  surface: LaneReport | LaneFailure | null
  dark: LaneReport | LaneFailure | null
  error?: string
}

const EMPTY_TOR: TorStatus = {
  systemdAvailable: false,
  torUnit: '…',
  torDefaultUnit: '…',
  unitEnabled: false,
  socksPort: 9050,
  socksOpen: false,
  ready: false,
  detail: 'Lendo systemctl…',
}

function isReport(value: LaneReport | LaneFailure | null): value is LaneReport {
  return Boolean(value && value.ok)
}

export function Console() {
  const [query, setQuery] = useState('open source intelligence')
  const [lane, setLane] = useState<Lane>('both')
  const [tor, setTor] = useState<TorStatus>(EMPTY_TOR)
  const [payload, setPayload] = useState<SearchPayload | null>(null)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const [configureLog, setConfigureLog] = useState('')

  const refreshTor = useCallback(async () => {
    const response = await fetch('/api/tor')
    if (response.ok) setTor((await response.json()) as TorStatus)
  }, [])

  useEffect(() => {
    void refreshTor()
  }, [refreshTor])

  async function onSearch(event: FormEvent) {
    event.preventDefault()
    setSearching(true)
    setError('')
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lane }),
        signal: AbortSignal.timeout(120000),
      })
      const data = (await response.json()) as SearchPayload
      if (!response.ok) {
        setPayload(null)
        setError(data.error ?? 'A busca falhou.')
        return
      }
      setPayload(data)
      setTor(data.tor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha de rede.')
    } finally {
      setSearching(false)
    }
  }

  async function onConfigure() {
    setConfiguring(true)
    setConfigureLog('')
    try {
      const response = await fetch('/api/tor', { method: 'POST', signal: AbortSignal.timeout(180000) })
      const data = (await response.json()) as { ok?: boolean; log?: string; error?: string; status?: TorStatus }
      setConfigureLog(data.log || data.error || (response.ok ? 'Tor configurado.' : 'Falha ao configurar.'))
      if (data.status) setTor(data.status)
      else await refreshTor()
    } catch (err) {
      setConfigureLog(err instanceof Error ? err.message : 'Falha ao chamar systemctl.')
    } finally {
      setConfiguring(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8">
      <header className="border-b border-[var(--line)] pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-[var(--brass)]">AGENTENGINE</p>
            <h1 className="mt-1 font-serif text-3xl text-[var(--text)] md:text-4xl">Busca OSINT</h1>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
              Superfície: raspa o DuckDuckGo e o texto das páginas. Dark: o mesmo piso de 30 resultados no índice Ahmia, só com o Tor no ar.
            </p>
          </div>
          <TorBadge tor={tor} configuring={configuring} onConfigure={onConfigure} />
        </div>

        <form onSubmit={onSearch} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">Consulta</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[var(--text)] outline-none focus:border-[var(--brass)]"
              placeholder="termo público"
              minLength={2}
              maxLength={160}
              required
            />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Faixa</legend>
              {([
                ['surface', 'Superfície'],
                ['dark', 'Dark'],
                ['both', 'As duas'],
              ] as const).map(([value, label]) => (
                <label key={value} className={`cursor-pointer border px-3 py-2 text-sm ${lane === value ? 'border-[var(--brass)] text-[var(--brass)]' : 'border-[var(--line)] text-[var(--muted)]'}`}>
                  <input
                    type="radio"
                    name="lane"
                    value={value}
                    checked={lane === value}
                    onChange={() => setLane(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <button
              type="submit"
              disabled={searching}
              className="border border-[var(--brass)] bg-[var(--brass)] px-4 py-2 text-sm font-semibold text-[#1a160c] disabled:opacity-60"
            >
              {searching ? 'Raspando…' : 'Buscar e resumir'}
            </button>
          </div>
        </form>
        {configureLog ? (
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap border border-[var(--line)] bg-black/30 p-3 font-mono text-xs text-[var(--muted)]">{configureLog}</pre>
        ) : null}
      </header>

      <main className="py-6">
        {searching ? (
          <p role="status" className="text-sm text-[var(--moss)]">
            Coletando pelo menos 30 resultados e montando o resumo. A faixa dark espera o circuito Tor.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
        ) : null}
        {payload ? (
          <div className="grid gap-8">
            <LaneBlock title="Superfície" report={payload.surface} />
            <LaneBlock title="Dark web" report={payload.dark} />
          </div>
        ) : !searching ? (
          <p className="text-sm text-[var(--muted)]">Digite um termo público e rode a busca. Nada é consultado até você enviar.</p>
        ) : null}
      </main>
    </div>
  )
}

function TorBadge({
  tor,
  configuring,
  onConfigure,
}: {
  tor: TorStatus
  configuring: boolean
  onConfigure: () => void
}) {
  return (
    <section className="w-full max-w-md border border-[var(--line)] bg-[var(--panel)] p-3 md:w-96">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">systemctl tor</h2>
        <span className={`font-mono text-xs ${tor.ready ? 'text-[var(--moss)]' : 'text-[var(--danger)]'}`}>
          {tor.ready ? 'socks 9050 aberto' : 'socks fechado'}
        </span>
      </div>
      <p className="mt-2 text-sm leading-snug text-[var(--text)]">{tor.detail}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-[var(--muted)]">
        <dt>systemd</dt>
        <dd>{tor.systemdAvailable ? 'disponível' : 'sem bus'}</dd>
        <dt>tor.service</dt>
        <dd>{tor.unitEnabled ? `enable · ${tor.torUnit}` : tor.torUnit}</dd>
        <dt>tor@default</dt>
        <dd>{tor.torDefaultUnit}</dd>
      </dl>
      <button
        type="button"
        onClick={onConfigure}
        disabled={configuring}
        className="mt-3 w-full border border-[var(--line)] px-3 py-2 text-sm text-[var(--text)] hover:border-[var(--brass)] disabled:opacity-60"
      >
        {configuring ? 'Rodando systemctl…' : 'Configurar Tor'}
      </button>
    </section>
  )
}

function LaneBlock({ title, report }: { title: string; report: LaneReport | LaneFailure | null }) {
  if (!report) return null
  if (!isReport(report)) {
    return (
      <section>
        <h2 className="font-serif text-2xl">{title}</h2>
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{report.error}</p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl">{title}</h2>
        <p className="font-mono text-xs text-[var(--muted)]">
          {report.count} resultados · piso {report.minimum} {report.metMinimum ? 'atingido' : 'não atingido'} · via {report.via}
        </p>
      </div>
      <article className="mt-3 border border-[var(--line)] bg-[var(--panel)] p-4">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--brass)]">{report.summary.headline}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{report.summary.brief}</p>
        {report.summary.themes.length > 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">Temas: {report.summary.themes.join(' · ')}</p>
        ) : null}
        {report.summary.topDomains.length > 0 ? (
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            Domínios: {report.summary.topDomains.map((item) => `${item.host} (${item.count})`).join(' · ')}
          </p>
        ) : null}
      </article>
      <ol className="mt-4 grid gap-3">
        {report.results.map((result, index) => (
          <li key={`${result.url}-${index}`} className="border border-[var(--line)] px-3 py-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-[var(--brass)]">{String(index + 1).padStart(2, '0')}</span>
              <a href={result.url} target="_blank" rel="noreferrer" className="text-base leading-snug">
                {result.title}
              </a>
            </div>
            <p className="mt-1 break-all font-mono text-[11px] text-[var(--muted)]">{result.displayUrl}</p>
            {result.snippet ? <p className="mt-2 text-sm text-[var(--text)]">{result.snippet}</p> : null}
            {result.scrapedExcerpt && result.scrapedExcerpt !== result.snippet ? (
              <p className="mt-2 border-l-2 border-[var(--brass)] pl-3 text-sm text-[var(--muted)]">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--brass)]">Trecho raspado · </span>
                {result.scrapedExcerpt}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
