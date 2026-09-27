export function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
}

export function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export function extractReadable(html: string): string {
  const without = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')

  const meta =
    without.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] ??
    without.match(/<meta[^>]+property=["']og:description["'][^>]*>/i)?.[0] ??
    ''
  const desc = meta.match(/content=["']([^"']+)["']/i)?.[1] ?? ''

  const paragraphs = [...without.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1] ?? ''))
    .filter((text) => text.length > 80)
    .slice(0, 3)

  return [stripTags(desc), ...paragraphs].filter(Boolean).join(' ').slice(0, 700)
}

export function parseDdg(html: string): { title: string; href: string; snippet: string }[] {
  const blocks = html.split(/<div class="result results_links/).slice(1)
  const rows: { title: string; href: string; snippet: string }[] = []

  for (const block of blocks) {
    if (block.includes('result--ad')) continue
    const anchor = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!anchor) continue
    const snippet = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)
    const title = stripTags(anchor[2] ?? '')
    const href = decodeEntities(anchor[1] ?? '')
    if (!title || !href) continue
    rows.push({
      title,
      href,
      snippet: snippet ? stripTags(snippet[1] ?? '') : '',
    })
  }

  return rows
}

export type FeedHit = { title: string; url: string; snippet: string; sourceUrl: string }

export function parseRssItems(xml: string): FeedHit[] {
  const hits: FeedHit[] = []
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const block = match[1] ?? ''
    const title = tagText(block, 'title')
    const url = tagText(block, 'link')
    const snippet = tagText(block, 'description')
    const sourceUrl = decodeEntities(block.match(/<source\b[^>]*\burl="([^"]+)"/i)?.[1] ?? '')
    if (!title || !url) continue
    hits.push({ title, url, snippet, sourceUrl })
  }
  return hits
}

function tagText(block: string, tag: string): string {
  const raw = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1] ?? ''
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  return stripTags(unwrapped)
}

export function ddgNextFields(html: string): Record<string, string> | null {
  const form = html.match(/<div class="nav-link">[\s\S]*?<\/form>/i)?.[0]
  if (!form) return null
  const fields: Record<string, string> = {}
  for (const tag of form.match(/<input\b[^>]*>/gi) ?? []) {
    if (/type=["']submit["']/i.test(tag)) continue
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1]
    const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? ''
    if (name) fields[name] = decodeEntities(value)
  }
  return fields.q ? fields : null
}

export function unwrapDdgUrl(href: string): string | null {
  const absolute = href.startsWith('//') ? `https:${href}` : href
  try {
    const url = new URL(absolute, 'https://duckduckgo.com')
    const uddg = url.searchParams.get('uddg')
    const target = uddg ?? absolute
    const parsed = new URL(target)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export type AhmiaHit = {
  title: string
  url: string
  displayUrl: string
  snippet: string
  lastSeen: string
}

export function parseAhmia(html: string): AhmiaHit[] {
  const hits: AhmiaHit[] = []
  for (const match of html.matchAll(/<li class="result"[^>]*>([\s\S]*?)<\/li>/gi)) {
    const block = match[1] ?? ''
    const anchor = block.match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!anchor) continue
    const href = decodeEntities(anchor[1] ?? '')
    const redirected = href.match(/[?&]redirect_url=([^&"]+)/i)?.[1]
    const url = decodeURIComponent(redirected ?? href)
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      continue
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
    const cite = stripTags(block.match(/<cite>([\s\S]*?)<\/cite>/i)?.[1] ?? '')
    const paragraph = stripTags(block.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? '')
    const lastSeen = stripTags(block.match(/data-timestamp="([^"]+)"/i)?.[1] ?? '')
    const title = stripTags(anchor[2] ?? '')
    if (!title) continue
    hits.push({
      title,
      url: parsed.toString(),
      displayUrl: cite || parsed.hostname,
      snippet: paragraph,
      lastSeen,
    })
  }
  return hits
}

export function ahmiaHiddenFields(html: string): Record<string, string> {
  const form = html.match(/<form\b[^>]*action="\/search\/"[^>]*>[\s\S]*?<\/form>/i)?.[0] ?? ''
  const fields: Record<string, string> = {}
  for (const tag of form.match(/<input\b[^>]*>/gi) ?? []) {
    if (!/type=["']hidden["']/i.test(tag)) continue
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1]
    const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? ''
    if (name) fields[name] = decodeEntities(value)
  }
  return fields
}

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.onion|0\.0\.0\.0)$/i

export function isPublicWebUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
    if (PRIVATE_HOST.test(host)) return false
    if (host.includes(':')) {
      const v6 = host
      if (v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')) return false
      return true
    }
    const parts = host.split('.').map((part) => Number(part))
    if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      const [a, b] = parts
      if (a === 10 || a === 127 || a === 0) return false
      if (a === 169 && b === 254) return false
      if (a === 172 && b !== undefined && b >= 16 && b <= 31) return false
      if (a === 192 && b === 168) return false
    }
    return true
  } catch {
    return false
  }
}
