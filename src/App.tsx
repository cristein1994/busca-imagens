import { useCallback, useState } from 'react'
import { hasAccessKey, searchPhotos } from './api/unsplash'
import type { UnsplashPhoto } from './types/unsplash'
import { SearchBar } from './components/SearchBar'
import { ImageGrid } from './components/ImageGrid'
import { Lightbox } from './components/Lightbox'
import { SetupMessage } from './components/SetupMessage'
import styles from './App.module.css'

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export default function App() {
  const configured = hasAccessKey()
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [selected, setSelected] = useState<UnsplashPhoto | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (!configured) return

    setStatus('loading')
    setErrorMessage('')
    setLastQuery(query)
    setSelected(null)

    try {
      const results = await searchPhotos(query)
      setPhotos(results)
      setStatus(results.length === 0 ? 'empty' : 'success')
    } catch (err) {
      setPhotos([])
      setStatus('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro inesperado ao buscar imagens.',
      )
    }
  }, [configured])

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Busca Imagens</h1>
          <p className={styles.subtitle}>
            Encontre fotos gratuitas do Unsplash
          </p>
        </div>
        <SearchBar
          onSearch={handleSearch}
          loading={status === 'loading'}
          disabled={!configured}
        />
      </header>

      <main className={styles.main}>
        {!configured && <SetupMessage />}

        {configured && status === 'idle' && (
          <p className={styles.hint}>
            Digite um termo e pressione Enter ou clique em Buscar.
          </p>
        )}

        {status === 'loading' && (
          <div className={styles.state} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            Carregando…
          </div>
        )}

        {status === 'error' && (
          <div className={styles.error} role="alert">
            <strong>Erro</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        {status === 'empty' && (
          <p className={styles.state}>
            Sem resultados para “{lastQuery}”. Tente outro termo.
          </p>
        )}

        {status === 'success' && (
          <section aria-label="Resultados">
            <h2 className={styles.resultsTitle}>
              Resultados
              {lastQuery ? (
                <span className={styles.queryTag}> — {lastQuery}</span>
              ) : null}
            </h2>
            <ImageGrid photos={photos} onSelect={setSelected} />
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Feito com a{' '}
          <a
            href="https://unsplash.com/?utm_source=busca_imagens&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
          >
            API do Unsplash
          </a>
        </p>
      </footer>

      {selected && (
        <Lightbox photo={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
