import type { SavedCase } from './types'

const KEY = 'orbe.cases.v1'

function isCase(value: unknown): value is SavedCase {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SavedCase>
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.query === 'string' &&
    typeof item.kind === 'string' &&
    typeof item.notes === 'string' &&
    Boolean(item.snapshot) &&
    Array.isArray(item.snapshot?.modules)
  )
}

function write(cases: SavedCase[]) {
  localStorage.setItem(KEY, JSON.stringify(cases.slice(0, 40)))
  window.dispatchEvent(new Event('orbe-cases'))
}

export function loadCases(): SavedCase[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCase)
  } catch {
    return []
  }
}

export function upsertCase(item: SavedCase) {
  const next = [item, ...loadCases().filter((entry) => entry.id !== item.id)]
  write(next)
}

export function deleteCase(id: string) {
  write(loadCases().filter((entry) => entry.id !== id))
}

export function subscribeCases(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener()
  }
  window.addEventListener('orbe-cases', listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('orbe-cases', listener)
    window.removeEventListener('storage', onStorage)
  }
}
