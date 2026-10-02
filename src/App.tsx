import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { MODES, type HealthResponse, type ScrapeMode, type ScrapeResult } from './types/scrape'
import { downloadCsv, downloadJson, fetchHealth, runScrape } from './lib/api'
import styles from './App.module.css'

type FormState = {
  query: string
  location: string
  maxItems: number
  datePosted: string
  profileMode: string
  searches: string
}

const INITIAL: FormState = {
  query: '',
  location: 'Brazil',
  maxItems: 10,
  datePosted: 'pastMonth',
  profileMode: 'Short',
  searches: '',
}

const PLACEHOLDERS: Record<ScrapeMode, string> = {
  profile: 'https://www.linkedin.com/in/williamhgates\noutra-url-ou-slug',
  search: 'Software Engineer',
  company: 'https://www.linkedin.com/company/google',
  jobs: 'react developer',
}

export default function App() {
  const [mode, setMode] = useState<ScrapeMode>('profile')
  const [form, setForm] = useState<FormState>(INITIAL)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScrapeResult | null>(null)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() =>
        setHealth({ ok: false, hasToken: false, actors: {} as HealthResponse['actors'] }),
      )
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body = buildBody(mode, form)
      const data = await runScrape(mode, body)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no scrape')
    } finally {
      setLoading(false)
    }
  }

  const active = MODES.find((m) => m.id === mode)!

  return (
    <div className={styles.shell}>
      <div className={styles.atmosphere} aria-hidden />
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <p className={styles.brand}>LINC SCRAPE</p>
          <h1 className={styles.headline}>LinkedIn público, estruturado.</h1>
          <p className={styles.lede}>
            Perfis, busca de pessoas, empresas e vagas via Actors Apify — sem cookie, token só no
            servidor.
          </p>
        </div>
        <div className={styles.status}>
          <span className={health?.hasToken ? styles.dotOk : styles.dotWarn} />
          {health?.hasToken ? 'APIFY_TOKEN ativo' : 'Configure APIFY_TOKEN no .env'}
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Modos de scrape">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? styles.tabActive : styles.tab}
            onClick={() => {
              setMode(m.id)
              setError(null)
            }}
          >
            {m.label}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        <section className={styles.panel}>
          <p className={styles.panelEyebrow}>{active.actor}</p>
          <h2 className={styles.panelTitle}>{active.label}</h2>
          <p className={styles.panelBlurb}>{active.blurb}</p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>
              {mode === 'profile'
                ? 'URLs / slugs (um por linha)'
                : mode === 'company'
                  ? 'URLs de empresa (um por linha)'
                  : mode === 'jobs'
                    ? 'Keywords'
                    : 'Termo de busca'}
              <textarea
                className={mode === 'profile' || mode === 'company' ? styles.textarea : styles.input}
                rows={mode === 'profile' || mode === 'company' ? 4 : 1}
                value={form.query}
                onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                placeholder={PLACEHOLDERS[mode]}
                required
              />
            </label>

            {mode === 'company' && (
              <label className={styles.label}>
                Busca por nome (opcional)
                <input
                  className={styles.input}
                  value={form.searches}
                  onChange={(e) => setForm((f) => ({ ...f, searches: e.target.value }))}
                  placeholder="Microsoft, Apify"
                />
              </label>
            )}

            {(mode === 'search' || mode === 'jobs') && (
              <label className={styles.label}>
                Localização
                <input
                  className={styles.input}
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Brazil / São Paulo / Remote"
                />
              </label>
            )}

            {mode === 'search' && (
              <label className={styles.label}>
                Modo do perfil
                <select
                  className={styles.input}
                  value={form.profileMode}
                  onChange={(e) => setForm((f) => ({ ...f, profileMode: e.target.value }))}
                >
                  <option value="Short">Short</option>
                  <option value="Full">Full</option>
                  <option value="Full + email search">Full + email search</option>
                </select>
              </label>
            )}

            {mode === 'jobs' && (
              <label className={styles.label}>
                Período
                <select
                  className={styles.input}
                  value={form.datePosted}
                  onChange={(e) => setForm((f) => ({ ...f, datePosted: e.target.value }))}
                >
                  <option value="past24Hours">Últimas 24h</option>
                  <option value="pastWeek">Última semana</option>
                  <option value="pastMonth">Último mês</option>
                  <option value="any">Qualquer</option>
                </select>
              </label>
            )}

            {(mode === 'search' || mode === 'jobs') && (
              <label className={styles.label}>
                Limite (máx. 50)
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={50}
                  value={form.maxItems}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxItems: Number(e.target.value) || 10 }))
                  }
                />
              </label>
            )}

            <div className={styles.actions}>
              <button className={styles.cta} type="submit" disabled={loading || !health?.hasToken}>
                {loading ? 'Scrapando…' : 'Rodar scrape'}
              </button>
              {result && (
                <>
                  <button
                    type="button"
                    className={styles.ghost}
                    onClick={() =>
                      downloadJson(`linkedin-${result.mode}-${Date.now()}.json`, result.items)
                    }
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    className={styles.ghost}
                    onClick={() =>
                      downloadCsv(`linkedin-${result.mode}-${Date.now()}.csv`, result.items)
                    }
                  >
                    Export CSV
                  </button>
                </>
              )}
            </div>
          </form>

          {error && <p className={styles.error}>{error}</p>}
        </section>

        <section className={styles.results}>
          <div className={styles.resultsHead}>
            <h2 className={styles.panelTitle}>Resultados</h2>
            {result && (
              <p className={styles.meta}>
                {result.itemCount} itens · run {result.runId} · {result.status}
              </p>
            )}
          </div>

          {!result && !loading && (
            <p className={styles.empty}>Nenhum scrape ainda. Escolha um modo e rode.</p>
          )}
          {loading && <p className={styles.empty}>Aguardando Actor Apify…</p>}

          {result && result.items.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {previewColumns(result.items).map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item, i) => (
                    <tr key={i}>
                      {previewColumns(result.items).map((col) => (
                        <td key={col}>{cellValue(item, col)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result && result.items.length === 0 && (
            <p className={styles.empty}>Actor finalizou sem itens.</p>
          )}

          {result && (
            <details className={styles.raw}>
              <summary>JSON bruto</summary>
              <pre>{JSON.stringify(result.items, null, 2)}</pre>
            </details>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        Dados públicos via Apify Store. Respeite os Termos do LinkedIn e limites de uso.
      </footer>
    </div>
  )
}

function buildBody(mode: ScrapeMode, form: FormState): Record<string, unknown> {
  switch (mode) {
    case 'profile':
      return { queries: form.query }
    case 'search':
      return {
        searchQuery: form.query.trim(),
        locations: form.location ? [form.location] : [],
        maxItems: form.maxItems,
        profileScraperMode: form.profileMode,
      }
    case 'company':
      return {
        companies: form.query,
        searches: form.searches,
      }
    case 'jobs':
      return {
        keywords: form.query.trim(),
        location: form.location,
        maxItems: form.maxItems,
        datePosted: form.datePosted,
      }
  }
}

const COLUMN_PREFS = [
  'fullName',
  'firstName',
  'lastName',
  'headline',
  'title',
  'jobTitle',
  'companyName',
  'name',
  'location',
  'linkedInUrl',
  'linkedinUrl',
  'url',
  'profileUrl',
  'publicIdentifier',
  'description',
]

function previewColumns(items: Record<string, unknown>[]): string[] {
  const keys = new Set<string>()
  for (const item of items.slice(0, 5)) {
    Object.keys(item).forEach((k) => keys.add(k))
  }
  const preferred = COLUMN_PREFS.filter((k) => keys.has(k))
  if (preferred.length >= 3) return preferred.slice(0, 6)
  return Array.from(keys).slice(0, 6)
}

function cellValue(item: Record<string, unknown>, col: string): string {
  const v = item[col]
  if (v == null) return '—'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 120)
  return String(v)
}
