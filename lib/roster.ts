import { LABFERT_UNITS, type RosterRow } from '../data/labfert-roster.ts'

export type LinkedinKind = 'slug' | 'token'

export type RosterPerson = RosterRow & {
  city: string
  unit: string | null
  linkedinKind: LinkedinKind
  band: string
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function linkedinKind(url: string): LinkedinKind {
  const slug = url.split('/in/')[1]?.split(/[/?#]/)[0] ?? ''
  if (/^AC[wW][A-Za-z0-9_-]{8,}$/.test(slug)) return 'token'
  return 'slug'
}

export function titleBand(title: string): string {
  const text = fold(title)
  if (/\b(ceo|founder|diretor|gerente|supervisor|lider)\b/.test(text)) return 'Liderança'
  if (text.includes('analista')) return 'Analista'
  if (text.includes('tecnic')) return 'Técnico'
  if (/\b(auxiliar|preparador|responsavel|escultor)\b/.test(text)) return 'Operação'
  if (text.includes('information technology') || text.includes('tecnologia')) return 'TI'
  return 'Outro'
}

export function cityOf(location: string): string {
  const [city] = location.split(',')
  return (city ?? location).trim() || 'Sem cidade'
}

export function unitFor(location: string): string | null {
  const city = fold(cityOf(location))
  const unit = LABFERT_UNITS.find((item) => fold(item.city) === city)
  return unit ? `${unit.city}, ${unit.state}` : null
}

export function peopleFrom(rows: RosterRow[]): RosterPerson[] {
  return rows.map((row) => ({
    ...row,
    city: cityOf(row.location),
    unit: unitFor(row.location),
    linkedinKind: linkedinKind(row.linkedinUrl),
    band: titleBand(row.title),
  }))
}

export function rosterSummary(rows: RosterRow[]) {
  const people = peopleFrom(rows)
  const names = new Map<string, { label: string; count: number }>()
  const cities = new Map<string, number>()
  const bands = new Map<string, number>()
  let emails = 0
  let tokens = 0
  let onUnit = 0

  for (const person of people) {
    const key = fold(person.fullName)
    const current = names.get(key)
    if (current) current.count += 1
    else names.set(key, { label: person.fullName, count: 1 })
    cities.set(person.city, (cities.get(person.city) ?? 0) + 1)
    bands.set(person.band, (bands.get(person.band) ?? 0) + 1)
    if (person.email) emails += 1
    if (person.linkedinKind === 'token') tokens += 1
    if (person.unit) onUnit += 1
  }

  const duplicates = [...names.values()].filter((item) => item.count > 1).map((item) => item.label)

  return {
    rows: people.length,
    uniqueNames: names.size,
    emails,
    tokens,
    publicSlugs: people.length - tokens,
    onUnit,
    offUnit: people.length - onUnit,
    duplicates,
    cities: [...cities.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    bands: [...bands.entries()].sort((a, b) => b[1] - a[1]),
  }
}

export function rosterBrief(rows: RosterRow[]): string {
  const summary = rosterSummary(rows)
  const topCities = summary.cities.slice(0, 4).map(([city, count]) => `${city} (${count})`).join(', ')
  const bands = summary.bands.map(([band, count]) => `${band.toLowerCase()} ${count}`).join(', ')
  return `Quadro com ${summary.rows} linhas e ${summary.uniqueNames} nomes. ${summary.emails} e-mails já vinham preenchidos. ${summary.onUnit} linhas caem numa unidade publicada no site da LabFert; ${summary.offUnit} ficam fora dessa lista. Faixas: ${bands}. Cidades com mais linhas: ${topCities}. ${summary.tokens} links do LinkedIn são identificadores internos (ACw…), sem slug público.`
}
