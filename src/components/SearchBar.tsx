import { useState, type FormEvent, type KeyboardEvent } from 'react'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  onSearch: (query: string) => void
  loading: boolean
  disabled?: boolean
}

export function SearchBar({ onSearch, loading, disabled = false }: SearchBarProps) {
  const [query, setQuery] = useState('')

  function submit() {
    const trimmed = query.trim()
    if (!trimmed || loading || disabled) return
    onSearch(trimmed)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search">
      <label className={styles.srOnly} htmlFor="search-input">
        Buscar imagens
      </label>
      <input
        id="search-input"
        className={styles.input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar imagens…"
        disabled={loading || disabled}
        autoComplete="off"
        enterKeyHint="search"
      />
      <button
        className={styles.button}
        type="submit"
        disabled={loading || disabled || !query.trim()}
      >
        {loading ? 'Buscando…' : 'Buscar'}
      </button>
    </form>
  )
}
