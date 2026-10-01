import type { PromptTask } from '../types/studio'
import { LENGTH_LABELS } from '../lib/defaults'
import { Field } from './Field'
import styles from './Panel.module.css'

interface TaskPanelProps {
  task: PromptTask
  onChange: (patch: Partial<PromptTask>) => void
}

export function TaskPanel({ task, onChange }: TaskPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="task-title">
      <header className={styles.head}>
        <h2 id="task-title">Tarefa</h2>
        <p>O pedido concreto que o prompt deve resolver agora.</p>
      </header>

      <Field label="Objetivo">
        <textarea
          className={styles.textarea}
          rows={4}
          value={task.goal}
          onChange={(e) => onChange({ goal: e.target.value })}
          placeholder="O que você quer que a IA faça?"
        />
      </Field>

      <Field label="Contexto da tarefa">
        <textarea
          className={styles.textarea}
          rows={3}
          value={task.context}
          onChange={(e) => onChange({ context: e.target.value })}
          placeholder="Detalhes, material de referência, restrições do momento..."
        />
      </Field>

      <Field label="Notas extras">
        <textarea
          className={styles.textarea}
          rows={2}
          value={task.extraNotes}
          onChange={(e) => onChange({ extraNotes: e.target.value })}
          placeholder="Observações opcionais"
        />
      </Field>

      <div className={styles.grid2}>
        <Field label="Extensão">
          <select
            className={styles.control}
            value={task.length}
            onChange={(e) => onChange({ length: e.target.value as PromptTask['length'] })}
          >
            {Object.entries(LENGTH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Criatividade: ${task.creativity}`}>
          <input
            className={styles.range}
            type="range"
            min={0}
            max={100}
            value={task.creativity}
            onChange={(e) => onChange({ creativity: Number(e.target.value) })}
          />
        </Field>
      </div>
    </section>
  )
}
