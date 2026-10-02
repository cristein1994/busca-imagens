import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { MODES, type HealthResponse, type ScrapeMode, type ScrapeResult } from './types/scrape'
import { downloadCsv, downloadJson, fetchHealth, runScrape } from './lib/api'
import styles from './App.module.css'

type FormState = {
  query: string
  searchQuery: string
  location: string
  maxItems: number
  datePosted: string
  profileMode: string
  searches: string
  includeEmail: boolean
  includePhone: boolean
  onlyWithEmail: boolean
  onlyWithPhone: boolean
}

const INITIAL: FormState = {
  query: '',
  searchQuery: '',
  location: 'Brazil',
  maxItems: 10,
  datePosted: 'pastMonth',
  profileMode: 'Full + email search',
  searches: '',
  includeEmail: true,
  includePhone: true,
  onlyWithEmail: false,
  onlyWithPhone: false,
}

const PLACEHOLDERS: Record<ScrapeMode, string> = {
  contacts: 'https://www.linkedin.com/in/williamhgates\noutro-perfil',
  profile: 'https://www.linkedin.com/in/williamhgates\noutra-url-ou-slug',
  search: 'Software Engineer',
  company: 'https://www.linkedin.com/company/google',
  jobs: 'react developer',
}

export default function App() {
  const [mode, setMode] = useState<ScrapeMode>('contacts')
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
  const columns = result ? previewColumns(result.items, mode) : []

  return (
    <div className={styles.shell}>
      <div className={styles.atmosphere} aria-hidden />
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <p className={styles.brand}>LINC SCRAPE</p>
          <h1 className={styles.headline}>Usuários, e-mail e telefone.</h1>
          <p className={styles.lede}>
            Contatos LinkedIn via Apify: perfil + busca de e-mail + enrichment de telefone. Token só
            no servidor.
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
            {mode === 'contacts' ? (
              <>
                <label className={styles.label}>
                  URLs de perfil (um por linha) — ou deixe vazio e use a busca
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    value={form.query}
                    onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                    placeholder={PLACEHOLDERS.contacts}
                  />
                </label>
                <label className={styles.label}>
                  Busca por cargo/skill (se não informar URLs)
                  <input
                    className={styles.input}
                    value={form.searchQuery}
                    onChange={(e) => setForm((f) => ({ ...f, searchQuery: e.target.value }))}
                    placeholder="CTO, Recruiter, Software Engineer"
                  />
                </label>
                <label className={styles.label}>
                  Localização (busca)
                  <input
                    className={styles.input}
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Brazil / São Paulo"
                  />
                </label>
              </>
            ) : (
              <label className={styles.label}>
                {mode === 'profile'
                  ? 'URLs / slugs (um por linha)'
                  : mode === 'company'
                    ? 'URLs de empresa (um por linha)'
                    : mode === 'jobs'
                      ? 'Keywords'
                      : 'Termo de busca'}
                <textarea
                  className={
                    mode === 'profile' || mode === 'company' ? styles.textarea : styles.input
                  }
                  rows={mode === 'profile' || mode === 'company' ? 4 : 1}
                  value={form.query}
                  onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                  placeholder={PLACEHOLDERS[mode]}
                  required
                />
              </label>
            )}

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

            {mode === 'profile' && (
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={form.includeEmail}
                  onChange={(e) => setForm((f) => ({ ...f, includeEmail: e.target.checked }))}
                />
                Buscar e-mail (~$0.01/perfil)
              </label>
            )}

            {mode === 'contacts' && (
              <div className={styles.checkGrid}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.includeEmail}
                    onChange={(e) => setForm((f) => ({ ...f, includeEmail: e.target.checked }))}
                  />
                  E-mail
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.includePhone}
                    onChange={(e) => setForm((f) => ({ ...f, includePhone: e.target.checked }))}
                  />
                  Telefone
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.onlyWithEmail}
                    onChange={(e) => setForm((f) => ({ ...f, onlyWithEmail: e.target.checked }))}
                  />
                  Só com e-mail
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={form.onlyWithPhone}
                    onChange={(e) => setForm((f) => ({ ...f, onlyWithPhone: e.target.checked }))}
                  />
                  Só com telefone
                </label>
              </div>
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

            {(mode === 'search' || mode === 'jobs' || mode === 'contacts') && (
              <label className={styles.label}>
                Limite (máx. {mode === 'contacts' ? 25 : 50})
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={mode === 'contacts' ? 25 : 50}
                  value={form.maxItems}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxItems: Number(e.target.value) || 10 }))
                  }
                />
              </label>
            )}

            <div className={styles.actions}>
              <button className={styles.cta} type="submit" disabled={loading || !health?.hasToken}>
                {loading ? 'Scrapando…' : mode === 'contacts' ? 'Buscar contatos' : 'Rodar scrape'}
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
                {result.enrichments
                  ? ` · phones matched ${result.enrichments.phoneMatches}`
                  : ''}
              </p>
            )}
          </div>

          {!result && !loading && (
            <p className={styles.empty}>
              Use Contatos para extrair e-mail e telefone de usuários LinkedIn.
            </p>
          )}
          {loading && (
            <p className={styles.empty}>
              Aguardando Actors Apify (e-mail e/ou telefone podem levar 1–3 min)…
            </p>
          )}

          {result && result.items.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item, i) => (
                    <tr key={i}>
                      {columns.map((col) => (
                        <td key={col}>{cellValue(item, col)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result && result.items.length === 0 && (
            <p className={styles.empty}>Actor finalizou sem itens (ou filtros removeram tudo).</p>
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
        Cobertura de e-mail/telefone depende dos Actors Apify — nem todo perfil tem contato
        encontrado. Use com APIFY_TOKEN e respeite os Termos do LinkedIn.
      </footer>
    </div>
  )
}

function buildBody(mode: ScrapeMode, form: FormState): Record<string, unknown> {
  switch (mode) {
    case 'contacts':
      return {
        queries: form.query,
        searchQuery: form.searchQuery.trim(),
        locations: form.location ? [form.location] : [],
        maxItems: form.maxItems,
        includeEmail: form.includeEmail,
        includePhone: form.includePhone,
        onlyWithEmail: form.onlyWithEmail,
        onlyWithPhone: form.onlyWithPhone,
      }
    case 'profile':
      return {
        queries: form.query,
        includeEmail: form.includeEmail,
      }
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

const CONTACT_COLUMNS = [
  'fullName',
  'email',
  'phone',
  'headline',
  'companyName',
  'location',
  'linkedinUrl',
]

const COLUMN_PREFS = [
  'fullName',
  'email',
  'phone',
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

function previewColumns(items: Record<string, unknown>[], mode: ScrapeMode): string[] {
  if (mode === 'contacts') {
    const keys = new Set(items.flatMap((item) => Object.keys(item)))
    return CONTACT_COLUMNS.filter((k) => keys.has(k))
  }
  const keys = new Set<string>()
  for (const item of items.slice(0, 5)) {
    Object.keys(item).forEach((k) => keys.add(k))
  }
  const preferred = COLUMN_PREFS.filter((k) => keys.has(k))
  if (preferred.length >= 3) return preferred.slice(0, 7)
  return Array.from(keys).slice(0, 7)
}

function cellValue(item: Record<string, unknown>, col: string): string {
  const v = item[col]
  if (v == null || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 120)
  return String(v)
}
