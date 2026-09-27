import { MAX_RESULTS, MIN_RESULTS } from './constants'
import { FetchError, fetchTextTor } from './fetch'
import { allowResultText } from './guard'
import { ahmiaHiddenFields, parseAhmia } from './html'
import { summarize } from './summarize'
import { torStatus } from './tor'
import type { LaneReport } from './types'

const ONION_ORIGIN = 'http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion'
const CLEARNET_ORIGIN = 'https://ahmia.fi'

async function loadIndex(query: string, origin: string): Promise<{ html: string; via: string }> {
  const home = await fetchTextTor(`${origin}/`)
  if (home.status >= 400) {
    throw new FetchError(`${origin} respondeu HTTP ${home.status}`)
  }
  const fields = ahmiaHiddenFields(home.body)
  const params = new URLSearchParams({ q: query, ...fields })
  const search = await fetchTextTor(`${origin}/search/?${params.toString()}`)
  if (search.status >= 400 || !search.body.includes('class="result"')) {
    throw new FetchError(`busca em ${origin} não devolveu resultados (HTTP ${search.status})`)
  }
  return { html: search.body, via: search.url }
}

export async function searchDark(query: string): Promise<LaneReport> {
  const status = await torStatus()
  if (!status.ready) {
    throw new Error('Tor não está aceitando conexões em 127.0.0.1:9050. Configure com systemctl enable --now tor.')
  }

  let loaded: { html: string; via: string } | null = null
  const errors: string[] = []
  for (const origin of [ONION_ORIGIN, CLEARNET_ORIGIN]) {
    try {
      loaded = await loadIndex(query, origin)
      break
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }
  if (!loaded) {
    throw new Error(errors.join(' | ') || 'Falha ao raspar o índice dark via Tor.')
  }

  const seen = new Set<string>()
  const results = []
  for (const hit of parseAhmia(loaded.html)) {
    const host = (() => {
      try {
        return new URL(hit.url).hostname
      } catch {
        return hit.displayUrl
      }
    })()
    if (seen.has(host)) continue
    const blob = `${hit.title} ${hit.snippet} ${hit.url}`
    if (!allowResultText(blob)) continue
    seen.add(host)
    const snippet = hit.lastSeen ? `${hit.snippet} Última visita no índice: ${hit.lastSeen}.` : hit.snippet
    results.push({
      title: hit.title,
      url: hit.url,
      displayUrl: hit.displayUrl,
      snippet,
      scrapedExcerpt: hit.snippet || null,
      source: 'ahmia' as const,
      lane: 'dark' as const,
    })
    if (results.length >= MAX_RESULTS) break
  }

  if (results.length === 0) {
    throw new Error('O índice dark não devolveu resultados utilizáveis para essa consulta.')
  }

  return {
    ok: true,
    lane: 'dark',
    count: results.length,
    minimum: MIN_RESULTS,
    metMinimum: results.length >= MIN_RESULTS,
    scrapedPages: results.length,
    via: `tor ${loaded.via}`,
    summary: summarize(query, results, 'Dark web'),
    results,
  }
}
