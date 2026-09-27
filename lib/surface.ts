import { MAX_RESULTS, MIN_RESULTS } from './constants'
import { fetchText } from './fetch'
import { allowResultText } from './guard'
import { extractReadable, isPublicWebUrl, parseDdg, parseRssItems, stripTags, unwrapDdgUrl } from './html'
import { mapPool } from './pool'
import { summarize } from './summarize'
import type { LaneReport, OsintResult } from './types'

const DDG = 'https://html.duckduckgo.com/html/'
const NEWS = 'https://news.google.com/rss/search'
const WIKI = 'https://en.wikipedia.org/w/api.php'

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function pushUnique(collected: OsintResult[], seen: Set<string>, result: OsintResult) {
  if (!isPublicWebUrl(result.url)) return
  if (!allowResultText(`${result.title} ${result.snippet} ${result.url}`)) return
  const key = result.url.replace(/\/$/, '')
  if (seen.has(key)) return
  seen.add(key)
  collected.push(result)
}

async function scrapeExcerpt(url: string): Promise<string | null> {
  try {
    const response = await fetchText(url, { timeoutMs: 8000, maxBytes: 400_000 })
    if (response.status >= 400) return null
    if (response.contentType && !/html|xml|text\/plain/i.test(response.contentType)) return null
    const text = extractReadable(response.body)
    return text.length > 40 ? text : null
  } catch {
    return null
  }
}

async function collectDdg(query: string, collected: OsintResult[], seen: Set<string>) {
  const response = await fetchText(`${DDG}?q=${encodeURIComponent(query)}`, { timeoutMs: 20000 })
  if (response.status >= 400 || !response.body.includes('result__a')) return
  for (const row of parseDdg(response.body)) {
    if (collected.length >= MAX_RESULTS) return
    const url = unwrapDdgUrl(row.href)
    if (!url) continue
    pushUnique(collected, seen, {
      title: row.title,
      url,
      displayUrl: hostOf(url),
      snippet: row.snippet,
      scrapedExcerpt: null,
      source: 'duckduckgo',
      lane: 'surface',
    })
  }
}

async function collectNews(query: string, collected: OsintResult[], seen: Set<string>) {
  const response = await fetchText(
    `${NEWS}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
    { timeoutMs: 20000, maxBytes: 2_000_000 },
  )
  if (response.status >= 400 || !response.body.includes('<item>')) return
  for (const item of parseRssItems(response.body)) {
    if (collected.length >= MAX_RESULTS) return
    const publisher = item.sourceUrl ? hostOf(item.sourceUrl) : 'news.google.com'
    pushUnique(collected, seen, {
      title: item.title,
      url: item.url,
      displayUrl: publisher,
      snippet: item.snippet,
      scrapedExcerpt: null,
      source: 'google-news',
      lane: 'surface',
    })
  }
}

async function collectWiki(query: string, collected: OsintResult[], seen: Set<string>) {
  const url = `${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=30&format=json&origin=*`
  const response = await fetchText(url, { timeoutMs: 15000, headers: { Accept: 'application/json' } })
  if (response.status >= 400) return
  let payload: { query?: { search?: { title?: string; snippet?: string }[] } }
  try {
    payload = JSON.parse(response.body) as typeof payload
  } catch {
    return
  }
  for (const hit of payload.query?.search ?? []) {
    if (collected.length >= MAX_RESULTS) return
    const title = hit.title?.trim()
    if (!title) continue
    const page = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
    pushUnique(collected, seen, {
      title,
      url: page,
      displayUrl: 'en.wikipedia.org',
      snippet: stripTags(hit.snippet ?? ''),
      scrapedExcerpt: null,
      source: 'wikipedia',
      lane: 'surface',
    })
  }
}

export async function searchSurface(query: string): Promise<LaneReport> {
  const seen = new Set<string>()
  const collected: OsintResult[] = []
  const vias: string[] = []

  await collectDdg(query, collected, seen)
  if (collected.some((item) => item.source === 'duckduckgo')) vias.push('duckduckgo')

  if (collected.length < MIN_RESULTS) {
    await collectNews(query, collected, seen)
    if (collected.some((item) => item.source === 'google-news')) vias.push('news.google.com')
  }
  if (collected.length < MIN_RESULTS) {
    await collectWiki(query, collected, seen)
    if (collected.some((item) => item.source === 'wikipedia')) vias.push('wikipedia')
  }

  const scrapeTargets = collected.slice(0, 8)
  const excerpts = await mapPool(scrapeTargets, 4, (result) => scrapeExcerpt(result.url))
  scrapeTargets.forEach((result, index) => {
    result.scrapedExcerpt = excerpts[index] ?? null
  })

  const results = collected.slice(0, MAX_RESULTS)
  if (results.length === 0) {
    throw new Error('A raspagem da superfície não encontrou resultados.')
  }
  return {
    ok: true,
    lane: 'surface',
    count: results.length,
    minimum: MIN_RESULTS,
    metMinimum: results.length >= MIN_RESULTS,
    scrapedPages: excerpts.filter(Boolean).length,
    via: vias.join(' + ') || 'superfície',
    summary: summarize(query, results, 'Superfície'),
    results,
  }
}
