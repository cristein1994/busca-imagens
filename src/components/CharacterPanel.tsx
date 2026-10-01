import type { Character } from '../types/studio'
import {
  KNOWLEDGE_SUGGESTIONS,
  PERSONALITY_SUGGESTIONS,
  TONE_LABELS,
} from '../lib/defaults'
import { Field } from './Field'
import { TagInput } from './TagInput'
import styles from './Panel.module.css'

interface CharacterPanelProps {
  character: Character
  onChange: (patch: Partial<Character>) => void
}

export function CharacterPanel({ character, onChange }: CharacterPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="char-title">
      <header className={styles.head}>
        <h2 id="char-title">Personagem</h2>
        <p>Identidade, voz, conhecimento e limites.</p>
      </header>

      <div className={styles.grid2}>
        <Field label="Nome">
          <input
            className={styles.control}
            value={character.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex: Ada Vale"
          />
        </Field>
        <Field label="Arquétipo">
          <input
            className={styles.control}
            value={character.archetype}
            onChange={(e) => onChange({ archetype: e.target.value })}
            placeholder="Ex: Mentora técnica"
          />
        </Field>
      </div>

      <Field label="Papel / função">
        <input
          className={styles.control}
          value={character.role}
          onChange={(e) => onChange({ role: e.target.value })}
          placeholder="O que esse personagem faz?"
        />
      </Field>

      <div className={styles.grid2}>
        <Field label="Tom">
          <select
            className={styles.control}
            value={character.tone}
            onChange={(e) => onChange({ tone: e.target.value as Character['tone'] })}
          >
            {Object.entries(TONE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Idioma">
          <input
            className={styles.control}
            value={character.language}
            onChange={(e) => onChange({ language: e.target.value })}
            placeholder="português brasileiro"
          />
        </Field>
      </div>

      <TagInput
        label="Traços de personalidade"
        values={character.personality}
        onChange={(personality) => onChange({ personality })}
        suggestions={PERSONALITY_SUGGESTIONS}
      />

      <Field label="Voz" hint="como fala, ritmo, vícios">
        <textarea
          className={styles.textarea}
          rows={3}
          value={character.voice}
          onChange={(e) => onChange({ voice: e.target.value })}
          placeholder="Descreva o jeito de falar..."
        />
      </Field>

      <Field label="Background / lore">
        <textarea
          className={styles.textarea}
          rows={4}
          value={character.background}
          onChange={(e) => onChange({ background: e.target.value })}
          placeholder="História, experiência, motivação..."
        />
      </Field>

      <TagInput
        label="Domínios de conhecimento"
        values={character.knowledge}
        onChange={(knowledge) => onChange({ knowledge })}
        suggestions={KNOWLEDGE_SUGGESTIONS}
      />

      <TagInput
        label="Limites / tabus"
        values={character.boundaries}
        onChange={(boundaries) => onChange({ boundaries })}
        placeholder="Ex: Não inventa fontes"
      />

      <TagInput
        label="Catchphrases"
        values={character.catchphrases}
        onChange={(catchphrases) => onChange({ catchphrases })}
        placeholder="Frase típica + Enter"
      />

      <Field label="Exemplo de diálogo">
        <textarea
          className={styles.textarea}
          rows={3}
          value={character.exampleDialogue}
          onChange={(e) => onChange({ exampleDialogue: e.target.value })}
          placeholder="Uma fala curta no estilo do personagem..."
        />
      </Field>
    </section>
  )
}
