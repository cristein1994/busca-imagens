import { lookup } from 'node:dns/promises'
import type { Source } from './types.ts'

const USER_AGENT =
  'Mozilla/5.0 (compatible; PlaygroundDeepSeek/1.0; +https://platform.deepseek.com/)'
const PAGE_LIMIT = 500_000

const STOP = new Set(
  'a o os as de da do das dos e em na no nas nos um uma para por com sem sob sobre entre como que se the of and to for in on at by from or is are was be as an'.split(
    ' ',
  ),
)
const GENERIC = new Set(['api', 'url', 'pdf', 'html', 'css', 'sql', 'json', 'http', 'https', 'rest', 'sdk'])

export function expandQueries(query: string): string[] {
  const raw = query.trim().slice(0, 180)
  if (!raw) return []
  const names = nameTokens(raw)
  const compact = stripAccents(raw)
    .split(/\s+/)
    .filter((token) => token && !STOP.has(token.toLowerCase()))
    .join(' ')
  const queries = [...names]
  if (compact && !queries.includes(compact)) queries.push(compact)
  if (queries.length === 0) queries.push(raw)
  return queries.slice(0, 3)
}

export async function searchWeb(query: string, limit = 6): Promise<Source[]> {
  const q = query.trim().slice(0, 200)
  if (!q) return []
  const [bing, wikiPt, wikiEn, ddg] = await Promise.all([
    searchBing(q).catch(() => [] as Source[]),
    searchWikipedia('pt', q).catch(() => [] as Source[]),
    searchWikipedia('en', q).catch(() => [] as Source[]),
    searchDuckDuckGo(q).catch(() => [] as Source[]),
  ])
  return rankSources(q, dedupe([...bing, ...wikiPt, ...wikiEn, ...ddg]), limit)
}

export function rankSources(query: string, sources: Source[], limit: number): Source[] {
  const names = nameTokens(query).map((token) => stripAccents(token).toLowerCase())
  const tokens = significantTokens(query)
  const ranked = sources
    .map((source) => ({ source, score: scoreSource(query, tokens, names, source) }))
    .filter((item) => item.score > 0)
    .filter((item) => names.length === 0 || names.some((name) => haystack(item.source).includes(name)))
    .sort((a, b) => b.score - a.score)
  return dedupe(ranked.map((item) => item.source)).slice(0, limit)
}

export async function readPage(rawUrl: string): Promise<{
  title: string
  url: string
  content: string
  excerpt: string
}> {
  const url = await assertPublicHttpUrl(rawUrl)
  if (isWikipediaArticle(url)) {
    const article = await readWikipedia(url)
    if (article) return article
  }

  const response = await fetchPublic(url)
  if (!response.ok) {
    throw new Error(`A página respondeu ${response.status}.`)
  }
  const type = (response.headers.get('content-type') ?? '').toLowerCase()
  if (
    type &&
    !type.includes('text/') &&
    !type.includes('html') &&
    !type.includes('xml') &&
    !type.includes('json')
  ) {
    throw new Error('Esse endereço não é uma página de texto.')
  }

  const html = await readLimited(response, PAGE_LIMIT)
  const parsed = htmlToText(html)
  const content = parsed.text.slice(0, 12_000)
  if (content.length < 40) throw new Error('A página não tem texto legível.')
  return {
    title: parsed.title || url.hostname,
    url: url.toString(),
    content,
    excerpt: content.slice(0, 280),
  }
}

async function searchBing(query: string): Promise<Source[]> {
  const endpoint = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss&count=8`
  const xml = await fetchText(endpoint)
  const blocks = xml.split(/<item\b/i).slice(1)
  const sources: Source[] = []
  for (const block of blocks) {
    const title = stripTags(xmlText(block, 'title'))
    const link = xmlText(block, 'link')
    const snippet = stripTags(xmlText(block, 'description'))
    if (!link.startsWith('http')) continue
    if (/bing\.com\/aclick|bing\.com\/ck\/a/i.test(link)) continue
    sources.push({ title: title || link, url: link, snippet: snippet.slice(0, 400) })
  }
  return sources
}

async function searchWikipedia(lang: 'pt' | 'en', query: string): Promise<Source[]> {
  const endpoint =
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&srlimit=3&utf8=1&format=json`
  const payload = await fetchJson(endpoint)
  const results = readWikiSearch(payload)
  return results.map((result) => ({
    title: result.title,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title.replaceAll(' ', '_'))}`,
    snippet: result.snippet,
  }))
}

async function searchDuckDuckGo(query: string): Promise<Source[]> {
  const html = await fetchText(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
  )
  if (html.includes('anomaly-modal')) return []
  const sources: Source[] = []
  const pattern =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(pattern)) {
    const url = unwrapDuckDuckGo(decodeEntities(match[1] ?? ''))
    const title = stripTags(match[2] ?? '')
    if (!url) continue
    sources.push({ title: title || url, url, snippet: '' })
    if (sources.length >= 5) break
  }
  return sources
}

async function readWikipedia(url: URL): Promise<{
  title: string
  url: string
  content: string
  excerpt: string
} | null> {
  const lang = url.hostname.split('.')[0]
  const slug = decodeURIComponent(url.pathname.replace(/^\/wiki\//, ''))
  if (!slug || slug.includes(':')) return null
  const title = slug.replaceAll('_', ' ')
  const endpoint =
    `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts` +
    `&explaintext=1&exchars=6000&redirects=1&titles=${encodeURIComponent(title)}&format=json`
  const payload = await fetchJson(endpoint)
  const page = readWikiExtract(payload)
  if (!page || page.content.length < 40) return null
  return {
    title: page.title,
    url: url.toString(),
    content: page.content,
    excerpt: page.content.slice(0, 280),
  }
}

function readWikiSearch(payload: unknown): { title: string; snippet: string }[] {
  if (!payload || typeof payload !== 'object') return []
  const query = (payload as { query?: unknown }).query
  if (!query || typeof query !== 'object') return []
  const search = (query as { search?: unknown }).search
  if (!Array.isArray(search)) return []
  const items: { title: string; snippet: string }[] = []
  for (const entry of search) {
    if (!entry || typeof entry !== 'object') continue
    const title = (entry as { title?: unknown }).title
    const snippet = (entry as { snippet?: unknown }).snippet
    if (typeof title !== 'string') continue
    items.push({
      title,
      snippet: stripTags(typeof snippet === 'string' ? snippet : '').slice(0, 400),
    })
  }
  return items
}

function readWikiExtract(payload: unknown): { title: string; content: string } | null {
  if (!payload || typeof payload !== 'object') return null
  const query = (payload as { query?: unknown }).query
  if (!query || typeof query !== 'object') return null
  const pages = (query as { pages?: unknown }).pages
  if (!pages || typeof pages !== 'object') return null
  for (const page of Object.values(pages)) {
    if (!page || typeof page !== 'object') continue
    const title = (page as { title?: unknown }).title
    const extract = (page as { extract?: unknown }).extract
    if (typeof title !== 'string' || typeof extract !== 'string') continue
    if (title === 'Missingtitle') continue
    return { title, content: extract.trim().slice(0, 12_000) }
  }
  return null
}

async function fetchPublic(url: URL, redirects = 0): Promise<Response> {
  if (redirects > 4) throw new Error('A página redirecionou vezes demais.')
  await assertPublicHttpUrl(url.toString())
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(12_000),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
    },
  })
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    await response.body?.cancel()
    if (!location) throw new Error('Redirecionamento sem destino.')
    return fetchPublic(new URL(location, url), redirects + 1)
  }
  return response
}

async function fetchText(endpoint: string): Promise<string> {
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(12_000),
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml,text/xml,*/*' },
  })
  if (!response.ok) throw new Error(`Busca respondeu ${response.status}.`)
  return readLimited(response, PAGE_LIMIT)
}

async function fetchJson(endpoint: string): Promise<unknown> {
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(12_000),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  })
  if (!response.ok) throw new Error(`Busca respondeu ${response.status}.`)
  return response.json()
}

async function readLimited(response: Response, max: number): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < max) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    total += value.byteLength
  }
  await reader.cancel().catch(() => undefined)
  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
  return buffer.subarray(0, max).toString('utf8')
}

function htmlToText(html: string): { title: string; text: string } {
  const title = decodeEntities(
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '',
  )
    .replace(/\s+/g, ' ')
    .trim()
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|iframe|canvas)\b[\s\S]*?<\/\1>/gi, ' ')
  const withBreaks = withoutNoise.replace(
    /<(br|\/p|\/div|\/h[1-6]|\/li|\/tr|\/section|\/article)\b[^>]*>/gi,
    '\n',
  )
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
  return { title: stripTags(title), text }
}

async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error('URL inválida.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Use um endereço http ou https.')
  }
  if (url.username || url.password) throw new Error('URL com credencial não é aceita.')
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    throw new Error('Endereço local não é aceito.')
  }
  if (isPrivateAddress(host) || !(await resolvesToPublic(host))) {
    throw new Error('Endereço de rede privada não é aceito.')
  }
  return url
}

async function resolvesToPublic(host: string): Promise<boolean> {
  if (isIp(host)) return !isPrivateAddress(host)
  try {
    const records = await lookup(host, { all: true, verbatim: true })
    if (records.length === 0) return false
    return records.every((record) => !isPrivateAddress(record.address))
  } catch {
    return false
  }
}

function isIp(host: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')
}

function isPrivateAddress(address: string): boolean {
  const mapped = address.toLowerCase().startsWith('::ffff:')
    ? address.slice(7)
    : address
  const parts = mapped.split('.').map((part) => Number(part))
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = parts
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a >= 224) return true
    return false
  }
  if (!address.includes(':')) return false
  const lower = address.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  const head = lower.split(':')[0] ?? ''
  if (head === 'fe80') return true
  if (/^f[cd][0-9a-f]{0,2}$/.test(head)) return true
  return false
}

function isWikipediaArticle(url: URL): boolean {
  return url.hostname.endsWith('.wikipedia.org') && url.pathname.startsWith('/wiki/')
}

function significantTokens(query: string): string[] {
  const tokens = stripAccents(query)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3 && !STOP.has(token) && !GENERIC.has(token))
  return [...new Set(tokens)]
}

function nameTokens(query: string): string[] {
  const tokens = query.split(/\s+/).map((token) => token.replace(/[^\p{L}\p{N}]/gu, ''))
  return [
    ...new Set(
      tokens.filter((token) => {
        if (token.length < 3) return false
        const folded = stripAccents(token).toLowerCase()
        if (STOP.has(folded) || GENERIC.has(folded)) return false
        const hasLower = /\p{Ll}/u.test(token)
        const hasUpper = /\p{Lu}/u.test(token)
        return hasLower && hasUpper
      }),
    ),
  ]
}

function scoreSource(query: string, tokens: string[], names: string[], source: Source): number {
  const text = haystack(source)
  let score = 0
  for (const token of tokens) {
    if (text.includes(token)) score += token.length >= 5 ? 4 : 2
  }
  for (const name of names) {
    if (text.includes(name)) score += 6
  }
  const folded = stripAccents(query).toLowerCase()
  if (/\bapi\b/.test(folded) && /\bapi\b/.test(text)) score += 3
  if (
    /document|docs|manual|guia|referenc/.test(folded) &&
    /document|docs|manual|guia|referenc/.test(text)
  ) {
    score += 5
  }
  return score
}

function haystack(source: Source): string {
  return stripAccents(`${source.title} ${source.snippet} ${source.url}`).toLowerCase()
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}+/gu, '')
}

function dedupe(sources: Source[]): Source[] {
  const seen = new Set<string>()
  const unique: Source[] = []
  for (const source of sources) {
    let key = source.url
    try {
      const url = new URL(source.url)
      url.hash = ''
      key = url.toString()
    } catch {
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({ ...source, url: key })
  }
  return unique
}

function unwrapDuckDuckGo(href: string): string {
  try {
    const url = new URL(href, 'https://duckduckgo.com')
    const uddg = url.searchParams.get('uddg')
    if (uddg) return uddg
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
  } catch {
    return ''
  }
  return ''
}

function xmlText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!match?.[1]) return ''
  return decodeEntities(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim()
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => safeChar(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => safeChar(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
}

function safeChar(code: number): string {
  if (!Number.isFinite(code) || code < 32 || code === 127) return ''
  return String.fromCodePoint(code)
}
