import { useCallback, useEffect, useState } from 'react'
import type { DorkFields, EngineInfo, MediaFilter, MediaHit, SearchMode, SearchResponse, TorStatus } from '../shared/contracts.ts'
import { emptyDork } from '../shared/contracts.ts'
import { embedFor, mediaKindFromUrl } from '../shared/media.ts'
import { fetchCatalog, fetchTor, searchMedia } from './api/client.ts'
import { DownloadDock } from './components/DownloadDock.tsx'
import { EngineRail } from './components/EngineRail.tsx'
import { QueryDeck } from './components/QueryDeck.tsx'
import { ResultWall } from './components/ResultWall.tsx'
import { Viewer } from './components/Viewer.tsx'

export default function App() {
  const [catalog, setCatalog] = useState<EngineInfo[]>([])
  const [counts, setCounts] = useState({ surface: 0, onion: 0 })
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [tor, setTor] = useState<TorStatus | null>(null)
  const [probing, setProbing] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('metadata')
  const [media, setMedia] = useState<MediaFilter>('both')
  const [nsfw, setNsfw] = useState(false)
  const [adultOk, setAdultOk] = useState(false)
  const [dork, setDork] = useState<DorkFields>(emptyDork())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [filesOnly, setFilesOnly] = useState(false)
  const [selected, setSelected] = useState<MediaHit | null>(null)

  useEffect(() => {
    void fetchCatalog()
      .then((data) => {
        setCatalog(data.engines)
        setCounts({ surface: data.surface, onion: data.onion })
        setEnabled(new Set(data.engines.map((engine) => engine.id)))
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Falha ao carregar motores.')
      })
    void fetchTor().then(setTor).catch(() => {
      setTor({ ok: false, proxy: null, detail: 'Não foi possível checar o Tor.', probed: false })
    })
  }, [])

  const probe = useCallback(() => {
    setProbing(true)
    void fetchTor(true)
      .then(setTor)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'A prova do Tor falhou.')
      })
      .finally(() => setProbing(false))
  }, [])

  const search = useCallback(() => {
    if (nsfw && !adultOk) return
    if (enabled.size === 0) {
      setError('Marque ao menos um motor.')
      return
    }
    setLoading(true)
    setError('')
    setSelected(null)
    void searchMedia({
      query,
      mode,
      media,
      nsfw: nsfw && adultOk,
      dork,
      engineIds: [...enabled],
    })
      .then((next) => {
        setResponse(next)
        setTor(next.tor)
      })
      .catch((reason: unknown) => {
        setResponse(null)
        setError(reason instanceof Error ? reason.message : 'A busca falhou.')
      })
      .finally(() => setLoading(false))
  }, [adultOk, dork, enabled, media, mode, nsfw, query])

  function toggleEngine(id: string) {
    setEnabled((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setGroup(network: EngineInfo['network'], on: boolean) {
    setEnabled((current) => {
      const next = new Set(current)
      for (const engine of catalog) {
        if (engine.network !== network) continue
        if (on) next.add(engine.id)
        else next.delete(engine.id)
      }
      return next
    })
  }

  function openUrl(url: string) {
    if (!url) return
    const kind = mediaKindFromUrl(url)
    const embed = embedFor(url)
    setSelected({
      id: `url-${url}`,
      title: url,
      pageUrl: url,
      mediaUrl: kind ? url : null,
      thumbUrl: kind === 'image' ? url : null,
      embedUrl: embed,
      kind: kind ?? (embed ? 'video' : 'page'),
      engineId: 'url',
      engineName: 'URL colada',
      network: url.includes('.onion') ? 'onion' : 'surface',
      snippet: '',
    })
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <p className="eyebrow">Arquivo de busca</p>
            <h1>Lente</h1>
          </div>
        </div>
        <p className="lede">
          Fotos e vídeos por metadados ou pelo que o arquivo descreve, com dorks,
          em {counts.surface || '…'} motores da surface e {counts.onion || '…'} da rede onion.
        </p>
      </header>

      <main className="layout">
        <QueryDeck
          query={query}
          mode={mode}
          media={media}
          nsfw={nsfw}
          adultOk={adultOk}
          dork={dork}
          loading={loading}
          onQuery={setQuery}
          onMode={setMode}
          onMedia={setMedia}
          onNsfw={setNsfw}
          onAdult={setAdultOk}
          onDork={(patch) => setDork((current) => ({ ...current, ...patch }))}
          onSubmit={search}
        />
        <div className="stage-col">
          {error ? <p className="warn" role="alert">{error}</p> : null}
          {loading ? <p className="loading" role="status">Consultando os motores marcados. Onion via Tor demora mais.</p> : null}
          {!loading && !response && !error ? (
            <p className="empty">A parede fica vazia até a primeira busca. O dork pronto aparece no painel.</p>
          ) : null}
          {response ? (
            <ResultWall
              hits={response.results}
              query={response.dork}
              filesOnly={filesOnly}
              onFilesOnly={setFilesOnly}
              onOpen={setSelected}
            />
          ) : null}
        </div>
      </main>

      <EngineRail
        engines={catalog}
        reports={response?.engines ?? []}
        enabled={enabled}
        tor={tor}
        probing={probing}
        onToggle={toggleEngine}
        onSetGroup={setGroup}
        onProbe={probe}
      />
      <DownloadDock onOpen={openUrl} />
      {selected ? <Viewer key={selected.id} hit={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  )
}
