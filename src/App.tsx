import { useMemo, useRef, useState, useTransition } from 'react'
import { DEMO_CLIENTS } from './data/demoClients'
import {
  matchesQuery,
  parseClientsCsv,
  parseClientsJson,
  toCsv,
} from './lib/clients'
import { clearClients, loadClients, saveClients } from './lib/storage'
import type { ClientRecord, SearchField } from './types/client'
import styles from './App.module.css'

function initialStore(): { records: ClientRecord[]; source: 'demo' | 'importado' } {
  const stored = loadClients()
  if (stored && stored.length > 0) {
    return { records: stored, source: 'importado' }
  }
  return { records: DEMO_CLIENTS, source: 'demo' }
}

export default function App() {
  const boot = useMemo(() => initialStore(), [])
  const [records, setRecords] = useState<ClientRecord[]>(boot.records)
  const [source, setSource] = useState<'demo' | 'importado'>(boot.source)
  const [query, setQuery] = useState('')
  const [field, setField] = useState<SearchField>('todos')
  const [selectedId, setSelectedId] = useState<string | null>(boot.records[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => records.filter((r) => matchesQuery(r, query, field)),
    [records, query, field],
  )

  const selected =
    filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null

  const persist = (next: ClientRecord[], nextSource: 'demo' | 'importado') => {
    setRecords(next)
    setSource(nextSource)
    setSelectedId(next[0]?.id ?? null)
    if (nextSource === 'importado') saveClients(next)
    else clearClients()
  }

  const onFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const lower = file.name.toLowerCase()
      const parsed = lower.endsWith('.json')
        ? parseClientsJson(text)
        : parseClientsCsv(text)
      if (parsed.length === 0) throw new Error('Nenhum registro encontrado no arquivo.')
      startTransition(() => persist(parsed, 'importado'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ler o arquivo.')
    }
  }

  const exportFiltered = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes-filtrados.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.app}>
      <header className={styles.hero}>
        <p className={styles.brand}>Clientes Local</p>
        <h1 className={styles.title}>Seus clientes, no seu arquivo.</h1>
        <p className={styles.lead}>
          Busca por CPF, e-mail ou telefone só nos dados que você importar. Nada
          consulta painéis externos.
        </p>
      </header>

      <aside className={styles.notice} role="note">
        Equivalente legal a um painel de consulta: organizador local. Não é clone
        da Work Consultoria — sem APIs, módulos ou base deles.
      </aside>

      <section className={styles.toolbar}>
        <div className={styles.searchRow}>
          <label className={styles.fieldLabel} htmlFor="q">
            Buscar
          </label>
          <input
            id="q"
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="CPF, e-mail, telefone ou nome"
            autoComplete="off"
          />
          <select
            className={styles.select}
            value={field}
            onChange={(e) => setField(e.target.value as SearchField)}
            aria-label="Campo de busca"
          >
            <option value="todos">Todos</option>
            <option value="cpf">CPF</option>
            <option value="email">E-mail</option>
            <option value="telefone">Telefone</option>
            <option value="nome">Nome</option>
          </select>
        </div>

        <div className={styles.actions}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
              e.target.value = ''
            }}
          />
          <button type="button" className={styles.btnPrimary} onClick={() => fileRef.current?.click()}>
            Importar CSV / JSON
          </button>
          <button type="button" className={styles.btn} onClick={exportFiltered} disabled={filtered.length === 0}>
            Exportar filtrados
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => persist(DEMO_CLIENTS, 'demo')}
          >
            Reset demo
          </button>
        </div>

        <p className={styles.meta}>
          {pending ? 'Atualizando… · ' : ''}
          {filtered.length} de {records.length} · fonte: {source}
          {source === 'demo' ? ' (fictícia)' : ' (localStorage)'}
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>

      <div className={styles.grid}>
        <ul className={styles.list} aria-label="Resultados">
          {filtered.length === 0 ? (
            <li className={styles.empty}>Nenhum registro com esse filtro.</li>
          ) : (
            filtered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={r.id === selected?.id ? styles.rowActive : styles.row}
                  onClick={() => setSelectedId(r.id)}
                >
                  <span className={styles.rowName}>{r.nome || 'Sem nome'}</span>
                  <span className={styles.rowSub}>
                    {r.cpf || '—'} · {r.email || 'sem e-mail'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <article className={styles.detail}>
          {selected ? (
            <>
              <h2>{selected.nome || 'Sem nome'}</h2>
              <dl className={styles.dl}>
                <div>
                  <dt>CPF</dt>
                  <dd>{selected.cpf || '—'}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{selected.email || '—'}</dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{selected.telefone || '—'}</dd>
                </div>
                <div>
                  <dt>Cidade</dt>
                  <dd>{selected.cidade || '—'}</dd>
                </div>
                <div className={styles.full}>
                  <dt>Notas</dt>
                  <dd>{selected.notas || '—'}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className={styles.empty}>Selecione um registro.</p>
          )}
        </article>
      </div>

      <footer className={styles.footer}>
        CSV esperado: <code>nome,cpf,email,telefone,cidade,notas</code>
      </footer>
    </div>
  )
}
