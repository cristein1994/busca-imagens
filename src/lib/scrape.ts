import type { GpProfile, Position } from '../types/gp'

export interface ScrapeResult {
  profiles: GpProfile[]
  sources: string[]
  errors: string[]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapPosition(code: string): Position {
  const c = code.toUpperCase()
  if (c.includes('ATV') || c === 'ATIVO') return 'ativo'
  if (c.includes('ATLB') || c.includes('LIBERAL')) return 'ativo-liberal'
  if (c.includes('PSV') || c.includes('PASS')) return 'passivo'
  return 'versatil'
}

/** Parse listagens do BOY.gp (markdown-ish HTML). */
export function parseBoyGpHtml(html: string, listUrl: string): GpProfile[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const profiles: GpProfile[] = []
  const seen = new Set<string>()

  const anchors = [...doc.querySelectorAll('a[href]')]
  for (const a of anchors) {
    const href = a.getAttribute('href') || ''
    if (!href.includes('boy.gp/') && !href.startsWith('/')) continue
    // perfil tipicamente /nome-slug/
    const m = href.match(/boy\.gp\/([a-z0-9-]+)\/?$/i) || href.match(/^\/([a-z0-9-]+)\/?$/i)
    if (!m) continue
    const slug = m[1]
    if (
      ['garotos-de-programa', 'mg', 'acompanhantes', 'regiao', 'estilo', 'fazem', 'para'].some(
        (x) => slug.includes(x),
      )
    ) {
      continue
    }

    const block = (a.closest('article, li, div') || a.parentElement)?.textContent || a.textContent || ''
    const text = block.replace(/\s+/g, ' ').trim()
    if (text.length < 8) continue

    const ageMatch = text.match(/(\d{2})\s*a(?:nos)?/i) || text.match(/(\d{2})\s*a\b/i)
    const cmMatch = text.match(/(\d{2}(?:[.,]\d)?)\s*cm/i)
    const posMatch = text.match(/\b(ATLB|ATV|VST|PSV|ATIVO|VERS[AÁ]TIL|PASSIVO)\b/i)
    const name =
      a.textContent?.replace(/\s+/g, ' ').trim() ||
      slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

    const age = ageMatch ? Number(ageMatch[1]) : 0
    if (!age || age < 21) continue

    const cityMatch = text.match(
      /(Uberaba|Uberlândia|Uberlandia|Ituiutaba|Araguari|Delta|Conquista)[^,]*/i,
    )
    const city = (cityMatch?.[1] || 'Uberaba').replace('Uberlandia', 'Uberlândia')

    const id = `scraped-${slugify(name)}-${city.toLowerCase()}`
    if (seen.has(id)) continue
    seen.add(id)

    const sizeCm = cmMatch ? Number(cmMatch[1].replace(',', '.')) : 0
    const position = mapPosition(posMatch?.[1] || 'VST')

    profiles.push({
      id,
      name,
      age,
      city,
      position,
      sizeCm: sizeCm || 16,
      tags: ['scrap-web', position, city.toLowerCase(), sizeCm >= 19 ? 'dotado' : 'pra-mamar'],
      services: ['encontros'],
      serves: ['homens'],
      hasLocal: /com local|local pr[oó]prio/i.test(text),
      sourceUrl: href.startsWith('http') ? href : `https://boy.gp/${slug}/`,
      sourceName: 'BOY.gp (scrap)',
      notes: `Puxado do scrap: ${listUrl}`,
      verified: false,
    })
  }

  // Fallback regex blocks if DOM structure is weird
  if (profiles.length === 0) {
    const re =
      /([A-ZÁÉÍÓÚÂÊÔÃÕ][\wÁ-ú'’.-]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕ][\wÁ-ú'’.-]+)*)\s+(ATLB|ATV|VST|PSV)\s+(\d{2}(?:[.,]\d)?)\s*cm\s+(\d{2})\s*a/gi
    let match: RegExpExecArray | null
    while ((match = re.exec(html)) !== null) {
      const name = match[1].trim()
      const age = Number(match[4])
      if (age < 21) continue
      const sizeCm = Number(match[3].replace(',', '.'))
      const position = mapPosition(match[2])
      const id = `scraped-${slugify(name)}`
      if (seen.has(id)) continue
      seen.add(id)
      profiles.push({
        id,
        name,
        age,
        city: 'Uberaba',
        position,
        sizeCm,
        tags: ['scrap-web', position, 'regex'],
        services: ['encontros'],
        serves: ['homens'],
        hasLocal: false,
        sourceUrl: listUrl,
        sourceName: 'BOY.gp (scrap)',
        notes: 'Parse regex da listagem.',
        verified: false,
      })
    }
  }

  return profiles
}

export function parseGarotoComLocalHtml(html: string, listUrl: string): GpProfile[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const profiles: GpProfile[] = []
  const seen = new Set<string>()

  for (const h of doc.querySelectorAll('h2, h3, h4')) {
    const name = h.textContent?.replace(/\s+/g, ' ').trim()
    if (!name || name.length < 3 || name.length > 40) continue
    if (/garotos|acompanhantes|especialidades|lista/i.test(name)) continue

    const block = (h.closest('article, section, li, div') || h.parentElement)?.textContent || ''
    const text = block.replace(/\s+/g, ' ').trim()
    const ageMatch = text.match(/(\d{2})\s*anos?/i)
    const age = ageMatch ? Number(ageMatch[1]) : 25
    if (age < 21) continue

    const id = `gcl-${slugify(name)}`
    if (seen.has(id)) continue
    seen.add(id)

    const link =
      h.querySelector('a')?.getAttribute('href') ||
      h.closest('a')?.getAttribute('href') ||
      listUrl

    profiles.push({
      id,
      name,
      age,
      city: 'Uberaba',
      position: /passivo/i.test(text)
        ? 'passivo'
        : /vers[aá]til/i.test(text)
          ? 'versatil'
          : /ativo/i.test(text)
            ? 'ativo'
            : 'versatil',
      sizeCm: Number(text.match(/(\d{2}(?:[.,]\d)?)\s*cm/i)?.[1]?.replace(',', '.') || 16),
      tags: ['scrap-web', 'garotocomlocal', 'uberaba'],
      services: ['encontros'],
      serves: ['homens'],
      hasLocal: /local/i.test(text),
      sourceUrl: link?.startsWith('http') ? link : `https://garotocomlocal.com.br${link || '/uberaba/'}`,
      sourceName: 'Garoto Com Local (scrap)',
      notes: 'Prospect do scrap — confirme cm/posição no anúncio.',
      verified: /verificad|documentos/i.test(text),
    })
  }

  return profiles
}

const BOY_URLS = [
  '/scrape/boygp/garotos-de-programa/mg/triangulo-mineiro-alto-paranaiba/regiao-de-uberaba/',
  '/scrape/boygp/garotos-de-programa/mg/triangulo-mineiro-alto-paranaiba/regiao-de-uberaba/acompanhantes/so-ativo/',
  '/scrape/boygp/garotos-de-programa/mg/triangulo-mineiro-alto-paranaiba/regiao-de-uberlandia/',
]

const GCL_URLS = ['/scrape/gcl/uberaba/']

async function loadOfflineSnapshot(): Promise<GpProfile[]> {
  try {
    const res = await fetch('/scraped.json', { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as GpProfile[]
    if (!Array.isArray(data)) return []
    return data.filter((p) => p && typeof p.id === 'string' && p.age >= 21)
  } catch {
    return []
  }
}

export async function scrapePublicListings(): Promise<ScrapeResult> {
  const profiles: GpProfile[] = []
  const sources: string[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  const pushAll = (list: GpProfile[]) => {
    for (const p of list) {
      if (p.age < 21) continue
      if (seen.has(p.id)) continue
      seen.add(p.id)
      profiles.push(p)
    }
  }

  for (const path of BOY_URLS) {
    try {
      const res = await fetch(path)
      if (!res.ok) throw new Error(`${path} → ${res.status}`)
      const html = await res.text()
      if (/just a moment|cf-browser-verification|cloudflare/i.test(html)) {
        errors.push(`${path} bloqueado por Cloudflare`)
        continue
      }
      sources.push(path)
      pushAll(parseBoyGpHtml(html, path.replace('/scrape/boygp', 'https://boy.gp')))
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  for (const path of GCL_URLS) {
    try {
      const res = await fetch(path)
      if (!res.ok) throw new Error(`${path} → ${res.status}`)
      const html = await res.text()
      if (/just a moment|cf-browser-verification|cloudflare/i.test(html)) {
        errors.push(`${path} bloqueado por Cloudflare`)
        continue
      }
      sources.push(path)
      pushAll(parseGarotoComLocalHtml(html, 'https://garotocomlocal.com.br/uberaba/'))
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  // Cloudflare / CORS: snapshot em public/scraped.json pra o Amigo Safado não ficar seco
  if (profiles.length === 0) {
    const snap = await loadOfflineSnapshot()
    if (snap.length) {
      sources.push('/scraped.json')
      pushAll(snap)
      errors.push('Live scrap vazio/bloqueado — usei snapshot offline (scraped.json)')
    }
  }

  return { profiles, sources, errors }
}

export function mergeCatalog(seed: GpProfile[], scraped: GpProfile[]): GpProfile[] {
  const map = new Map<string, GpProfile>()
  for (const p of seed) map.set(p.id, p)
  for (const p of scraped) {
    const key = p.id
    if (!map.has(key)) map.set(key, p)
  }
  return [...map.values()]
}
