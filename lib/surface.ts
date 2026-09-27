import { MAX_RESULTS, MIN_RESULTS } from './constants'
import { fetchText } from './fetch'
import { allowResultText } from './guard'
import { ddgNextFields, extractReadable, isPublicWebUrl, parseDdg, unwrapDdgUrl } from './html'
import { mapPool } from './pool'
import { summarize } from './summarize'
import type { LaneReport, OsintResult } from './types'

const DDG = 'https://html.duckduckgo.com/html/'

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

export async function searchSurface(query: string): Promise<LaneReport> {
  const seen = new Set<string>()
  const collected: OsintResult[] = []
  let pageHtml = ''
  let fields: Record<string, string> | null = null

  for (let page = 0; page < 6 && collected.length < MIN_RESULTS; page += 1) {
    const response = fields
      ? await fetchText(DDG, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: DDG },
          body: new URLSearchParams(fields).toString(),
          timeoutMs: 20000,
        })
      : await fetchText(`${DDG}?q=${encodeURIComponent(query)}`, { timeoutMs: 20000 })

    if (response.status >= 400 || !response.body.includes('result__a')) {
      if (collected.length === 0) {
        throw new Error(`DuckDuckGo recusou a raspagem (HTTP ${response.status}).`)
      }
      break
    }

    pageHtml = response.body
    for (const row of parseDdg(pageHtml)) {
      const url = unwrapDdgUrl(row.href)
      if (!url || !isPublicWebUrl(url)) continue
      const key = url.replace(/\/$/, '')
      if (seen.has(key)) continue
      if (!allowResultText(`${row.title} ${row.snippet} ${url}`)) continue
      seen.add(key)
      let displayUrl = url
      try {
        displayUrl = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        displayUrl = url
      }
      collected.push({
        title: row.title,
        url,
        displayUrl,
        snippet: row.snippet,
        scrapedExcerpt: null,
        source: 'duckduckgo',
        lane: 'surface',
      })
      if (collected.length >= MAX_RESULTS) break
    }

    if (collected.length >= MIN_RESULTS) break
    fields = ddgNextFields(pageHtml)
    if (!fields) break
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
    via: 'https://html.duckduckgo.com/html/',
    summary: summarize(query, results, 'Superfície'),
    results,
  }
}
