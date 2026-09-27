import { useId, type FormEvent } from 'react'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  value: string
  loading: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export function SearchBar({ value, loading, onChange, onSubmit }: SearchBarProps) {
  const inputId = useId()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search">
      <label className={styles.label} htmlFor={inputId}>
        Search public Telegram channels and groups
      </label>
      <div className={styles.field}>
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16.5 20 20.5" />
        </svg>
        <input
          id={inputId}
          className={styles.input}
          value={value}
          placeholder="Try python, news, crypto, or @telegram"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => onChange(event.target.value)}
        />
        {value && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Searching' : 'Search'}
        </button>
      </div>
    </form>
  )
}
