import type { Character } from '../types/studio'
import {
  HEAT_LABELS,
  KINK_SUGGESTIONS,
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
        <p>Identidade, voz, safadeza, kinks e limites. Adultos 21+.</p>
      </header>

      <div className={styles.grid2}>
        <Field label="Nome">
          <input
            className={styles.control}
            value={character.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex: Leo Prado"
          />
        </Field>
        <Field label="Arquétipo">
          <input
            className={styles.control}
            value={character.archetype}
            onChange={(e) => onChange({ archetype: e.target.value })}
            placeholder="Ex: Twink safado"
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
        <Field label="Heat / safadeza">
          <select
            className={styles.control}
            value={character.heat}
            onChange={(e) => onChange({ heat: e.target.value as Character['heat'] })}
          >
            {Object.entries(HEAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className={styles.grid2}>
        <Field label="Atração / foco">
          <input
            className={styles.control}
            value={character.attraction}
            onChange={(e) => onChange({ attraction: e.target.value })}
            placeholder="Ex: homens gays adultos 21+"
          />
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

      <Field label="Dinâmica sexual" hint="top / bottom / verse / dom…">
        <input
          className={styles.control}
          value={character.dynamics}
          onChange={(e) => onChange({ dynamics: e.target.value })}
          placeholder="Ex: verse bottom safado"
        />
      </Field>

      <Field label="Corpo / presença">
        <textarea
          className={styles.textarea}
          rows={3}
          value={character.body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Idade 21+, físico, pau, bunda, cheiro, vibe…"
        />
      </Field>

      <TagInput
        label="Traços de personalidade"
        values={character.personality}
        onChange={(personality) => onChange({ personality })}
        suggestions={PERSONALITY_SUGGESTIONS}
      />

      <TagInput
        label="Kinks / preferências"
        values={character.kinks}
        onChange={(kinks) => onChange({ kinks })}
        suggestions={KINK_SUGGESTIONS}
        placeholder="Kink + Enter"
      />

      <Field label="Voz" hint="como fala, dirty talk, ritmo">
        <textarea
          className={styles.textarea}
          rows={3}
          value={character.voice}
          onChange={(e) => onChange({ voice: e.target.value })}
          placeholder="Descreva o jeito de falar — pode ser sujo..."
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
        placeholder="Ex: Sem menores · Sem gore"
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
