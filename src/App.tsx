import { useEffect, useMemo, useState } from 'react'
import { AgeGate } from './components/AgeGate'
import { AmigoSafado } from './components/AmigoSafado'
import { Filters } from './components/Filters'
import { ProfileCard } from './components/ProfileCard'
import { ProfileDetail } from './components/ProfileDetail'
import { PROFILES } from './data/profiles'
import { loadFavorites, saveFavorites } from './lib/favorites'
import { defaultFilters, filterProfiles } from './lib/filter'
import { mergeCatalog, scrapePublicListings } from './lib/scrape'
import type { GpFilters, GpProfile } from './types/gp'
import styles from './App.module.css'

const AGE_KEY = 'boyradar_age_ok_v1'
const SCRAPED_KEY = 'boyradar_scraped_v1'

function loadScraped(): GpProfile[] {
  try {
    const raw = localStorage.getItem(SCRAPED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GpProfile[]
    return Array.isArray(parsed) ? parsed.filter((p) => p.age >= 21) : []
  } catch {
    return []
  }
}

export default function App() {
  const [ageOk, setAgeOk] = useState(() => localStorage.getItem(AGE_KEY) === '1')
  const [filters, setFilters] = useState<GpFilters>(defaultFilters)
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites())
  const [selected, setSelected] = useState<GpProfile | null>(null)
  const [onlyFavs, setOnlyFavs] = useState(false)
  const [scraped, setScraped] = useState<GpProfile[]>(() => loadScraped())
  const [scraping, setScraping] = useState(false)
  const [lastScrape, setLastScrape] = useState<{ count: number; errors: string[] }>()

  const catalog = useMemo(() => mergeCatalog(PROFILES, scraped), [scraped])

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  useEffect(() => {
    localStorage.setItem(SCRAPED_KEY, JSON.stringify(scraped))
  }, [scraped])

  const results = useMemo(() => {
    let list = filterProfiles(catalog, filters)
    if (onlyFavs) list = list.filter((p) => favorites.includes(p.id))
    return list
  }, [catalog, filters, favorites, onlyFavs])

  const runScrape = async () => {
    setScraping(true)
    try {
      const result = await scrapePublicListings()
      const before = new Set(catalog.map((p) => p.id))
      const fresh = result.profiles.filter((p) => !before.has(p.id) && p.age >= 21)
      setScraped((prev) => mergeCatalog(prev, result.profiles))
      setLastScrape({ count: fresh.length, errors: result.errors })
    } catch (e) {
      setLastScrape({
        count: 0,
        errors: [e instanceof Error ? e.message : 'Falha no scrap'],
      })
    } finally {
      setScraping(false)
    }
  }

  if (!ageOk) {
    return (
      <AgeGate
        onEnter={() => {
          localStorage.setItem(AGE_KEY, '1')
          setAgeOk(true)
        }}
      />
    )
  }

  return (
    <div className={styles.app}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.brand}>BOYRADAR</p>
          <h1>Buscador safado de garotos de programa</h1>
          <p className={styles.lead}>
            Teu amigo gay puto recomenda GP pelos anúncios — filtro + scrap de classificados
            públicos (21+). Combina no WhatsApp, sem Pix adiantado.
          </p>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={onlyFavs ? styles.chipOn : styles.chip}
              onClick={() => setOnlyFavs((v) => !v)}
            >
              {onlyFavs ? 'Mostrando favoritos' : 'Só favoritos'}
            </button>
            <button
              type="button"
              className={styles.chip}
              onClick={() => setFilters(defaultFilters())}
            >
              Reset Uberaba / só ativo / 17cm+
            </button>
            <button
              type="button"
              className={styles.chipOn}
              disabled={scraping}
              onClick={() => void runScrape()}
            >
              {scraping ? 'Scrapando web…' : `Scrap web (${catalog.length} no radar)`}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Filters
          filters={filters}
          resultCount={results.length}
          onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        />

        {results.length === 0 ? (
          <p className={styles.empty}>
            Nenhum perfil com esse filtro. Afrouxe cm, cidade ou manda o Amigo Safado scrapar a
            web.
          </p>
        ) : (
          <div className={styles.grid}>
            {results.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                favorite={favorites.includes(p.id)}
                onOpen={() => setSelected(p)}
                onToggleFavorite={() => {
                  setFavorites((prev) =>
                    prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                  )
                }}
              />
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <strong>BOYRADAR</strong>
        <span>
          Classificados públicos · scrap local via proxy · 21+ · não intermediamos
        </span>
      </footer>

      <AmigoSafado
        catalog={catalog}
        scraping={scraping}
        lastScrape={lastScrape}
        onScrape={() => void runScrape()}
      />

      {selected ? (
        <ProfileDetail profile={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  )
}
