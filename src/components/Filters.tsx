import { CITIES } from '../data/profiles'
import type { GpFilters } from '../types/gp'
import styles from './Filters.module.css'

interface FiltersProps {
  filters: GpFilters
  onChange: (patch: Partial<GpFilters>) => void
  resultCount: number
}

export function Filters({ filters, onChange, resultCount }: FiltersProps) {
  return (
    <section className={styles.wrap} aria-label="Filtros">
      <div className={styles.row}>
        <label>
          Busca
          <input
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="nome, tag, bairro…"
          />
        </label>
        <label>
          Cidade
          <select
            value={filters.city}
            onChange={(e) => onChange({ city: e.target.value })}
          >
            <option value="todas">Todas</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Posição
          <select
            value={filters.position}
            onChange={(e) =>
              onChange({ position: e.target.value as GpFilters['position'] })
            }
          >
            <option value="so-ativo">Só ativo (macho)</option>
            <option value="ativo">Ativo</option>
            <option value="ativo-liberal">Ativo liberal</option>
            <option value="versatil">Versátil</option>
            <option value="passivo">Passivo</option>
            <option value="todos">Todas</option>
          </select>
        </label>
        <label>
          Pau mín. (cm)
          <input
            type="number"
            min={0}
            max={40}
            step={0.5}
            value={filters.minCm}
            onChange={(e) => onChange({ minCm: Number(e.target.value) || 0 })}
          />
        </label>
        <label>
          Preço máx./h
          <input
            type="number"
            min={0}
            step={10}
            value={filters.maxPrice || ''}
            placeholder="0 = qualquer"
            onChange={(e) => onChange({ maxPrice: Number(e.target.value) || 0 })}
          />
        </label>
        <label>
          Ordenar
          <select
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as GpFilters['sort'] })}
          >
            <option value="cm-desc">Maior pau</option>
            <option value="price-asc">Menor preço</option>
            <option value="age-asc">Mais novo</option>
            <option value="name">Nome</option>
          </select>
        </label>
      </div>

      <div className={styles.checks}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={filters.servesMen}
            onChange={(e) => onChange({ servesMen: e.target.checked })}
          />
          Atende homens
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={filters.hasLocalOnly}
            onChange={(e) => onChange({ hasLocalOnly: e.target.checked })}
          />
          Só com local
        </label>
        <span className={styles.count}>{resultCount} resultado(s)</span>
      </div>
    </section>
  )
}
