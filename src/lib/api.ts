import type { HealthResponse, ScrapeMode, ScrapeResult } from '../types/scrape'

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error('API indisponível')
  return res.json()
}

export async function runScrape(
  mode: ScrapeMode,
  body: Record<string, unknown>,
): Promise<ScrapeResult> {
  const res = await fetch(`/api/scrape/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error ?? `Erro HTTP ${res.status}`)
  }
  return data as ScrapeResult
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(flattenRow(row)).forEach((k) => set.add(k))
      return set
    }, new Set<string>()),
  )
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [
    keys.join(','),
    ...rows.map((row) => {
      const flat = flattenRow(row)
      return keys.map((k) => escape(flat[k])).join(',')
    }),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function flattenRow(row: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenRow(value as Record<string, unknown>, path))
    } else if (Array.isArray(value)) {
      out[path] = value
        .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
        .join(' | ')
    } else {
      out[path] = value
    }
  }
  return out
}
