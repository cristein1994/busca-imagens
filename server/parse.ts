import type { MediaKind } from '../shared/contracts.ts'
import { embedFor, mediaKindFromUrl } from '../shared/media.ts'

export type RawHit = {
  title: string
  pageUrl: string
  mediaUrl: string | null
  thumbUrl: string | null
  embedUrl: string | null
  kind: MediaKind
  snippet: string
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCodePoint(Number(num)))
}

export function parseBing(html: string, kind: 'image' | 'video'): RawHit[] {
  const hits: RawHit[] = []
  const seen = new Set<string>()
  for (const chunk of html.split('murl&quot;:&quot;').slice(1)) {
    if (hits.length >= 12) break
    const mediaUrl = decodeHtml(chunk.split('&quot;')[0] ?? '')
    if (!mediaUrl.startsWith('http') || seen.has(mediaUrl)) continue
    seen.add(mediaUrl)
    const pageUrl = decodeHtml(
      /(?:purl|pgurl)&quot;:&quot;(.*?)&quot;/.exec(chunk)?.[1] ?? mediaUrl,
    )
    const thumbUrl = decodeHtml(/turl&quot;:&quot;(.*?)&quot;/.exec(chunk)?.[1] ?? '')
    const title = decodeHtml(
      /&quot;t&quot;:&quot;(.*?)&quot;/.exec(chunk)?.[1] ??
        /aria-label="([^"]+)"/.exec(chunk)?.[1] ??
        'Resultado Bing',
    ).replace(/[]/g, '')
    const directKind = mediaKindFromUrl(mediaUrl)
    hits.push({
      title: title.slice(0, 180),
      pageUrl,
      mediaUrl: directKind ? mediaUrl : null,
      thumbUrl: thumbUrl.startsWith('http') ? thumbUrl : null,
      embedUrl: embedFor(mediaUrl) ?? embedFor(pageUrl),
      kind: directKind ?? kind,
      snippet: '',
    })
  }
  return hits
}

const ASSET = /\.(css|js|mjs|map|svg|woff2?|ttf|ico)(?:$|[?#])/i
const SELF_HOSTS = new Set([
  'ahmia.fi',
  'juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion',
  'torch.cx',
  'torchsfe235y6d7wguqo6g4ucxqq7frrm5fpgkjssdhthsq4kjmmisid.onion',
  'duckduckgo.com',
  'duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion',
  'search.brave.com',
  'search.brave4u7jddbv7cyviptqjc7jusxh72uik7zt6adtckl5f4nwy2v72qd.onion',
  'metager.org',
  'metagerv65pwclop2rsfzg4jwowpavpwd6grhhlvdgsswvo6ii4akgyd.onion',
  'www.google.com',
  'google.com',
  'www.bing.com',
  'bing.com',
])

export function parseHtml(html: string, prefer: 'image' | 'video' | 'any'): RawHit[] {
  const decoded = decodeHtml(html)
  const titles = anchorTitles(html)
  const found = decoded.match(/https?:\/\/[^\s"'<>\\]+/g) ?? []
  const media: RawHit[] = []
  const pages: RawHit[] = []
  const seen = new Set<string>()
  for (const candidate of found) {
    const url = candidate.replace(/[),.;]+$/g, '')
    if (seen.has(url) || ASSET.test(url) || url.length > 500) continue
    seen.add(url)
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      continue
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
    if (SELF_HOSTS.has(parsed.hostname.replace(/^www\./, '')) || SELF_HOSTS.has(parsed.hostname)) continue
    const kind = mediaKindFromUrl(url)
    const embed = embedFor(url)
    const title = titles.get(url) ?? titles.get(parsed.hostname) ?? labelFor(parsed, embed)
    if (kind && (prefer === 'any' || prefer === kind)) {
      media.push({
        title,
        pageUrl: url,
        mediaUrl: url,
        thumbUrl: kind === 'image' ? url : null,
        embedUrl: null,
        kind,
        snippet: '',
      })
    } else if (embed || parsed.hostname.endsWith('.onion')) {
      pages.push({
        title,
        pageUrl: url,
        mediaUrl: null,
        thumbUrl: null,
        embedUrl: embed,
        kind: embed ? 'video' : 'page',
        snippet: '',
      })
    }
    if (media.length >= 8) break
  }
  if (media.length > 0) return media.slice(0, 8)
  const pagesWanted = pages.filter((hit) => hit.kind === 'video' || hit.pageUrl.includes('.onion') || prefer === 'any')
  return pagesWanted.slice(0, 6)
}

function anchorTitles(html: string): Map<string, string> {
  const titles = new Map<string, string>()
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const href = decodeHtml(match[1] ?? '')
    const title = decodeHtml((match[2] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    if (title.length < 8 || title.length > 180) continue
    titles.set(href, title)
    try {
      titles.set(new URL(href).hostname, title)
    } catch {
      continue
    }
  }
  return titles
}

function labelFor(url: URL, embed: string | null): string {
  if (embed && /youtube/.test(url.hostname)) {
    const id = url.searchParams.get('v') ?? url.pathname.split('/').filter(Boolean)[0]
    return id ? `Vídeo YouTube ${id}` : 'Vídeo YouTube'
  }
  if (embed) return `Vídeo em ${url.hostname.replace(/^www\./, '')}`
  if (url.hostname.endsWith('.onion')) return url.hostname
  return filenameTitle(url)
}

function filenameTitle(url: URL): string {
  const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? url.hostname)
  return last.replace(/[-_]+/g, ' ').slice(0, 140) || url.hostname
}

export function asHit(
  partial: Omit<RawHit, 'snippet' | 'embedUrl'> & { snippet?: string; embedUrl?: string | null },
): RawHit {
  return {
    ...partial,
    snippet: partial.snippet ?? '',
    embedUrl: partial.embedUrl ?? embedFor(partial.pageUrl) ?? embedFor(partial.mediaUrl),
  }
}
