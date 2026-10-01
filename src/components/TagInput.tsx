import styles from './TagInput.module.css'

interface TagInputProps {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  suggestions?: string[]
  placeholder?: string
}

export function TagInput({
  label,
  values,
  onChange,
  suggestions = [],
  placeholder = 'Digite e pressione Enter',
}: TagInputProps) {
  const add = (raw: string) => {
    const value = raw.trim()
    if (!value || values.includes(value)) return
    onChange([...values, value])
  }

  const remove = (value: string) => {
    onChange(values.filter((v) => v !== value))
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label}</span>
      <div className={styles.box}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            className={styles.tag}
            onClick={() => remove(v)}
            title="Remover"
          >
            {v}
            <span aria-hidden>×</span>
          </button>
        ))}
        <input
          className={styles.input}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add((e.target as HTMLInputElement).value)
              ;(e.target as HTMLInputElement).value = ''
            }
            if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value && values.length) {
              remove(values[values.length - 1])
            }
          }}
        />
      </div>
      {suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions
            .filter((s) => !values.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button key={s} type="button" className={styles.suggest} onClick={() => add(s)}>
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
