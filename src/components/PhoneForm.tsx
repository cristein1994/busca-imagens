import { useState, type FormEvent } from 'react'

type Props = {
  loading?: boolean
  onSubmit: (value: string) => void
  initial?: string
}

export function PhoneForm({ loading, onSubmit, initial = '' }: Props) {
  const [value, setValue] = useState(initial)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(value)
  }

  return (
    <form className="searchRow" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="phone">
        Número de telefone
      </label>
      <input
        id="phone"
        name="phone"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+55 11 99999-9999 ou 11999999999"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={loading}
      />
      <button className="primaryBtn" type="submit" disabled={loading || !value.trim()}>
        {loading ? 'Analisando…' : 'Investigar'}
      </button>
    </form>
  )
}
