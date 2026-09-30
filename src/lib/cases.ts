import type { PhoneIntel, SavedCase } from './types'

const STORAGE_KEY = 'linha.phone.cases.v1'

function readAll(): SavedCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedCase[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(cases: SavedCase[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
}

export function listCases(): SavedCase[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function saveCase(
  intel: PhoneIntel,
  notes = '',
  title?: string,
): SavedCase {
  const now = new Date().toISOString()
  const item: SavedCase = {
    id: crypto.randomUUID(),
    title: title?.trim() || intel.e164,
    phone: intel.raw,
    e164: intel.e164,
    notes,
    createdAt: now,
    updatedAt: now,
    snapshot: intel,
  }
  const all = readAll()
  all.unshift(item)
  writeAll(all.slice(0, 80))
  return item
}

export function updateCaseNotes(id: string, notes: string): SavedCase | null {
  const all = readAll()
  const idx = all.findIndex((c) => c.id === id)
  if (idx < 0) return null
  const next = {
    ...all[idx],
    notes,
    updatedAt: new Date().toISOString(),
  }
  all[idx] = next
  writeAll(all)
  return next
}

export function deleteCase(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id))
}

export function exportCaseMarkdown(item: SavedCase): string {
  const s = item.snapshot
  const lines = [
    `# Caso ${item.title}`,
    '',
    `- E.164: \`${s.e164}\``,
    `- Nacional: ${s.national}`,
    `- País: ${s.countryName} (+${s.countryCallingCode})`,
    `- Tipo: ${s.kindLabel}`,
    `- Válido: ${s.valid ? 'sim' : 'não'}`,
    `- Possível: ${s.possible ? 'sim' : 'não'}`,
  ]
  if (s.br) {
    lines.push(
      `- DDD: ${s.br.ddd} · ${s.br.state} · ${s.br.region}`,
      `- Cidades: ${s.br.cities.join(', ')}`,
    )
  }
  lines.push('', '## Notas', '', item.notes || '_sem notas_', '')
  lines.push(`Atualizado: ${item.updatedAt}`)
  return lines.join('\n')
}
