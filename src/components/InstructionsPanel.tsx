import type { Instructions } from '../types/studio'
import { FORMAT_LABELS, REASONING_LABELS } from '../lib/defaults'
import { Field } from './Field'
import { TagInput } from './TagInput'
import styles from './Panel.module.css'

interface InstructionsPanelProps {
  instructions: Instructions
  onChange: (patch: Partial<Instructions>) => void
}

export function InstructionsPanel({ instructions, onChange }: InstructionsPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="inst-title">
      <header className={styles.head}>
        <h2 id="inst-title">Instruções</h2>
        <p>Missão, formato, regras e critérios de sucesso.</p>
      </header>

      <Field label="Título da missão">
        <input
          className={styles.control}
          value={instructions.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Ex: System prompt de produção"
        />
      </Field>

      <Field label="Missão">
        <textarea
          className={styles.textarea}
          rows={4}
          value={instructions.mission}
          onChange={(e) => onChange({ mission: e.target.value })}
          placeholder="O que o agente deve alcançar..."
        />
      </Field>

      <div className={styles.grid2}>
        <Field label="Público-alvo">
          <input
            className={styles.control}
            value={instructions.audience}
            onChange={(e) => onChange({ audience: e.target.value })}
            placeholder="Quem recebe a resposta?"
          />
        </Field>
        <Field label="Formato de saída">
          <select
            className={styles.control}
            value={instructions.outputFormat}
            onChange={(e) =>
              onChange({ outputFormat: e.target.value as Instructions['outputFormat'] })
            }
          >
            {Object.entries(FORMAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Estilo de raciocínio">
        <select
          className={styles.control}
          value={instructions.reasoning}
          onChange={(e) =>
            onChange({ reasoning: e.target.value as Instructions['reasoning'] })
          }
        >
          {Object.entries(REASONING_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Contexto operacional">
        <textarea
          className={styles.textarea}
          rows={3}
          value={instructions.context}
          onChange={(e) => onChange({ context: e.target.value })}
          placeholder="Onde isso roda? Produto, RPG, pipeline..."
        />
      </Field>

      <TagInput
        label="Regras obrigatórias"
        values={instructions.constraints}
        onChange={(constraints) => onChange({ constraints })}
        placeholder="Nova regra + Enter"
      />

      <TagInput
        label="Sempre incluir"
        values={instructions.mustInclude}
        onChange={(mustInclude) => onChange({ mustInclude })}
      />

      <TagInput
        label="Nunca fazer / evitar"
        values={instructions.mustAvoid}
        onChange={(mustAvoid) => onChange({ mustAvoid })}
      />

      <Field label="Critérios de sucesso">
        <textarea
          className={styles.textarea}
          rows={3}
          value={instructions.successCriteria}
          onChange={(e) => onChange({ successCriteria: e.target.value })}
          placeholder="Como saber que a resposta ficou boa?"
        />
      </Field>
    </section>
  )
}
