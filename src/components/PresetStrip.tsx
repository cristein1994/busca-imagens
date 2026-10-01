import { useMemo, useState } from 'react'
import { CHARACTER_PRESETS, INSTRUCTION_PRESETS } from '../data/presets'
import styles from './PresetStrip.module.css'

interface PresetStripProps {
  onCharacter: (id: string) => void
  onInstructions: (id: string) => void
}

type Filter = 'todos' | 'safadeza' | 'outros'

export function PresetStrip({ onCharacter, onInstructions }: PresetStripProps) {
  const [filter, setFilter] = useState<Filter>('safadeza')

  const characters = useMemo(() => {
    if (filter === 'safadeza') {
      return CHARACTER_PRESETS.filter((p) => p.tag === 'Safadeza gay')
    }
    if (filter === 'outros') {
      return CHARACTER_PRESETS.filter((p) => p.tag !== 'Safadeza gay')
    }
    return CHARACTER_PRESETS
  }, [filter])

  const instructions = useMemo(() => {
    if (filter === 'safadeza') {
      return INSTRUCTION_PRESETS.filter((p) => p.tag === 'Safadeza gay')
    }
    if (filter === 'outros') {
      return INSTRUCTION_PRESETS.filter((p) => p.tag !== 'Safadeza gay')
    }
    return INSTRUCTION_PRESETS
  }, [filter])

  return (
    <section className={styles.wrap} id="presets" aria-labelledby="presets-title">
      <div className={styles.head}>
        <div>
          <h2 id="presets-title">Presets prontos</h2>
          <p>Safadeza gay 21+ na frente — ou filtre o que quiser.</p>
        </div>
        <div className={styles.filters} role="group" aria-label="Filtro de presets">
          <button
            type="button"
            className={filter === 'safadeza' ? styles.filterActive : undefined}
            onClick={() => setFilter('safadeza')}
          >
            Safadeza gay
          </button>
          <button
            type="button"
            className={filter === 'outros' ? styles.filterActive : undefined}
            onClick={() => setFilter('outros')}
          >
            Outros
          </button>
          <button
            type="button"
            className={filter === 'todos' ? styles.filterActive : undefined}
            onClick={() => setFilter('todos')}
          >
            Todos
          </button>
        </div>
      </div>

      <div className={styles.block}>
        <h3>Personagens</h3>
        <div className={styles.row}>
          {characters.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.tag === 'Safadeza gay' ? `${styles.card} ${styles.hot}` : styles.card}
              onClick={() => onCharacter(p.id)}
            >
              <span className={styles.tag}>{p.tag}</span>
              <strong>{p.label}</strong>
              <span className={styles.blurb}>{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <h3>Pacotes de instruções</h3>
        <div className={styles.row}>
          {instructions.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.tag === 'Safadeza gay' ? `${styles.card} ${styles.hot}` : styles.card}
              onClick={() => onInstructions(p.id)}
            >
              <span className={styles.tag}>{p.tag}</span>
              <strong>{p.label}</strong>
              <span className={styles.blurb}>{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
