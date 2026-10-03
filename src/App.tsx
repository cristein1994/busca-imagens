import { useEffect, useMemo, useState } from 'react'
import { AgeGate } from './components/AgeGate'
import { Filters } from './components/Filters'
import { ProfileCard } from './components/ProfileCard'
import { ProfileDetail } from './components/ProfileDetail'
import { PROFILES } from './data/profiles'
import { loadFavorites, saveFavorites } from './lib/favorites'
import { defaultFilters, filterProfiles } from './lib/filter'
import type { GpFilters, GpProfile } from './types/gp'
import styles from './App.module.css'

const AGE_KEY = 'boyradar_age_ok_v1'

export default function App() {
  const [ageOk, setAgeOk] = useState(() => localStorage.getItem(AGE_KEY) === '1')
  const [filters, setFilters] = useState<GpFilters>(defaultFilters)
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites())
  const [selected, setSelected] = useState<GpProfile | null>(null)
  const [onlyFavs, setOnlyFavs] = useState(false)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const results = useMemo(() => {
    let list = filterProfiles(PROFILES, filters)
    if (onlyFavs) list = list.filter((p) => favorites.includes(p.id))
    return list
  }, [filters, favorites, onlyFavs])

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
          <h1>Buscador de garotos de programa</h1>
          <p className={styles.lead}>
            Filtra por cidade, posição, cm e quem atende homem. Catálogo seed 21+ com links
            públicos — combine direto no WhatsApp.
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
            Nenhum perfil com esse filtro. Afrouxe cm, cidade ou posição.
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
          Classificados públicos · adultos 21+ · não intermediamos · sem Pix adiantado
        </span>
      </footer>

      {selected ? (
        <ProfileDetail profile={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  )
}
