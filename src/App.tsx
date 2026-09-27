import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, LANGUAGES, type SearchResponse } from '../shared/chat'
import { searchChats } from './api/client'
import { DetailPanel } from './components/DetailPanel'
import { ResultList } from './components/ResultList'
import { SearchBar } from './components/SearchBar'
import { useDebounced } from './hooks/useDebounced'
import styles from './App.module.css'

type TypeFilter = 'all' | 'channel' | 'group'
type SortKey = 'relevance' | 'members'

const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'channel', label: 'Channels' },
  { id: 'group', label: 'Groups' },
]

export default function App() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query, 280)
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null)
  const activeQuery = submittedQuery ?? debouncedQuery
  const [type, setType] = useState<TypeFilter>('all')
  const [category, setCategory] = useState('All')
  const [language, setLanguage] = useState('all')
  const [sort, setSort] = useState<SortKey>('relevance')
  const [payload, setPayload] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const requestKey = `${activeQuery}::${type}::${retry}`
  const [seenKey, setSeenKey] = useState(requestKey)

  if (seenKey !== requestKey) {
    setSeenKey(requestKey)
    setLoading(true)
    setError('')
  }

  useEffect(() => {
    const controller = new AbortController()

    searchChats(activeQuery, type, controller.signal)
      .then((data) => {
        setPayload(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Search failed.')
      })

    return () => controller.abort()
  }, [activeQuery, type, retry])

  const visible = useMemo(() => {
    const results = payload?.results ?? []
    const filtered = results.filter((chat) => {
      if (category !== 'All' && chat.category !== category) return false
      if (language !== 'all' && chat.language !== language) return false
      return true
    })
    if (sort === 'members') {
      return [...filtered].sort((a, b) => (b.members ?? -1) - (a.members ?? -1))
    }
    return filtered
  }, [payload, category, language, sort])

  const selectedChat = visible.find(
    (chat) => chat.username.toLowerCase() === selected?.toLowerCase(),
  ) ?? payload?.results.find(
    (chat) => chat.username.toLowerCase() === selected?.toLowerCase(),
  ) ?? null

  const filtersHideResults = (payload?.results.length ?? 0) > 0 && visible.length === 0

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <div className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M20.5 4.2 3.8 10.6c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.7 5.1c.2.6.1.8.7.8.3 0 .5-.1.7-.4l2.4-2.3 4.3 3.2c.8.4 1.3.2 1.5-.7l2.8-13.1c.3-1.1-.4-1.6-1.5-1.3Z" />
            </svg>
          </div>
          <div>
            <p className={styles.eyebrow}>Public directory</p>
            <h1>Channel Engine</h1>
          </div>
        </div>
        <p className={styles.lede}>
          Search Telegram channels and groups from a public catalog, live t.me pages, and a public web index.
          Private chats stay out of this search.
        </p>
        <SearchBar
          value={query}
          loading={loading}
          onChange={(value) => {
            setQuery(value)
            setSubmittedQuery(null)
          }}
          onSubmit={() => setSubmittedQuery(query.trim())}
        />
      </header>

      <main className={styles.main}>
        <div className={styles.filters}>
          <div className={styles.segment} role="tablist" aria-label="Chat type">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={type === option.id}
                className={type === option.id ? styles.segmentOn : undefined}
                onClick={() => setType(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className={styles.selectLabel}>
            Topic
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="All">All topics</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className={styles.selectLabel}>
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="all">Any language</option>
              {LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.selectLabel}>
            Sort
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="relevance">Relevance</option>
              <option value="members">Audience</option>
            </select>
          </label>
        </div>

        <div className={styles.meta} aria-live="polite">
          {loading && <span>Searching…</span>}
          {!loading && payload && (
            <span>
              {visible.length} {visible.length === 1 ? 'result' : 'results'}
              {activeQuery ? ` for “${activeQuery}”` : ' in the catalog'}
              {payload.catalogSize ? ` · ${payload.catalogSize} cataloged chats` : ''}
            </span>
          )}
        </div>

        {payload?.warning && <p className={styles.warning}>{payload.warning}</p>}
        {error && (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button>
          </div>
        )}

        {!payload && loading && (
          <div className={styles.skeleton} aria-hidden="true">
            <span /><span /><span /><span />
          </div>
        )}

        {payload && visible.length > 0 && (
          <ResultList chats={visible} selected={selected} onSelect={setSelected} />
        )}

        {payload && !loading && visible.length === 0 && (
          <div className={styles.empty}>
            <h2>{filtersHideResults ? 'Nothing matches these filters' : 'No public chats found'}</h2>
            <p>
              {filtersHideResults
                ? 'Clear the topic or language filter to see the rest of this search.'
                : `Try a channel name, a topic, or a public username such as @${activeQuery.replace(/^@/, '') || 'telegram'}.`}
            </p>
            {filtersHideResults && (
              <button
                type="button"
                onClick={() => {
                  setCategory('All')
                  setLanguage('all')
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Profiles and post previews come from public t.me pages. Keyword discovery also checks the public Lyzem index.
          Open a result to join it in Telegram.
        </p>
      </footer>

      {selected && (
        <DetailPanel
          username={selected}
          fallback={selectedChat}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
