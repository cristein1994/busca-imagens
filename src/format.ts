import { LANGUAGES } from '../shared/chat'

export function formatCount(value: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatExact(value: number | null): string {
  if (value == null) return 'Unknown'
  return new Intl.NumberFormat('en').format(value)
}

export function formatWhen(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function initial(title: string): string {
  const char = [...title.trim()][0]
  return char ? char.toUpperCase() : '#'
}

export function avatarHue(username: string): number {
  let hash = 0
  for (const char of username) hash = (hash * 33 + char.charCodeAt(0)) % 360
  return hash
}

export function languageLabel(code: string): string {
  return LANGUAGES.find((language) => language.id === code)?.label ?? 'Other'
}

export function sourceLabel(source: 'catalog' | 'index' | 'live', live: boolean): string {
  if (live) return 'Live'
  if (source === 'catalog') return 'Catalog'
  if (source === 'index') return 'Web index'
  return 'Live'
}
