import { CHARACTER_PRESETS, INSTRUCTION_PRESETS } from '../data/presets'
import styles from './PresetStrip.module.css'

interface PresetStripProps {
  onCharacter: (id: string) => void
  onInstructions: (id: string) => void
}

export function PresetStrip({ onCharacter, onInstructions }: PresetStripProps) {
  return (
    <section className={styles.wrap} id="presets" aria-labelledby="presets-title">
      <div className={styles.head}>
        <h2 id="presets-title">Presets prontos</h2>
        <p>Comece rápido e refine no estúdio.</p>
      </div>

      <div className={styles.block}>
        <h3>Personagens</h3>
        <div className={styles.row}>
          {CHARACTER_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.card}
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
          {INSTRUCTION_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.card}
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
