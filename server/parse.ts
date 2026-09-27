import type { Chat, ChatType, PostPreview } from '../shared/chat.ts'

export interface ScoredChat extends Chat {
  score: number
}

const USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,31}$/

export function extractHandle(query: string): string | null {
  const trimmed = query.trim()
  const link = trimmed.match(/^(?:https?:\/\/)?t\.me\/([A-Za-z][A-Za-z0-9_]{3,31})\/?$/i)
  if (link?.[1] && USERNAME.test(link[1])) return link[1]
  const at = trimmed.match(/^@([A-Za-z][A-Za-z0-9_]{3,31})$/)
  if (at?.[1]) return at[1]
  const bare = trimmed.match(/^([A-Za-z][A-Za-z0-9_]{3,31})$/)
  if (bare?.[1]) return bare[1]
  return null
}

function safeCode(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return ''
  return String.fromCodePoint(code)
}

export function decodeHtml(input: string, preserveLines = false): string {
  let text = input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => safeCode(Number(num)))

  text = text.replace(/<br\s*\/?>/gi, preserveLines ? '\n' : ' ')
  text = text.replace(/<a\b[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi, (_, href: string) => ` ${href} `)
  text = text.replace(/<[^>]+>/g, ' ')

  if (preserveLines) {
    return text
      .split('\n')
      .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return text.replace(/\s+/g, ' ').trim()
}

export function safeImage(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    const host = parsed.hostname
    const allowed =
      host === 't.me' ||
      host === 'telesco.pe' ||
      host.endsWith('.telesco.pe') ||
      host === 'telegram.org' ||
      host.endsWith('.telegram.org')
    return allowed ? parsed.toString() : null
  } catch {
    return null
  }
}

export function parseCounts(extra: string): {
  members: number | null
  online: number | null
  type: ChatType | null
} {
  const text = extra.replace(/\u00a0/g, ' ')
  const low = text.toLowerCase()
  const type: ChatType | null = low.includes('subscriber')
    ? 'channel'
    : low.includes('member')
      ? 'group'
      : null
  const nums = [...text.matchAll(/(\d[\d\s]*)/g)]
    .map((match) => Number(match[1].replace(/\s/g, '')))
    .filter((value) => Number.isFinite(value))
  const online = low.includes('online') && nums.length > 1 ? nums[1] : null
  return { members: nums[0] ?? null, online, type }
}

function metaContent(html: string, property: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${property}"`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1])
  }
  return ''
}

function blockText(html: string, className: string): string {
  const match = html.match(new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)</div>`, 'i'))
  return match?.[1] ? decodeHtml(match[1]) : ''
}

export function parseTelegramPage(html: string, username: string): Chat | null {
  if (!html.includes('tgme_page_extra')) return null
  const extra = html.match(/class="tgme_page_extra">([^<]*)</)?.[1] ?? ''
  const counts = parseCounts(decodeHtml(extra))
  if (!counts.type || !USERNAME.test(username)) return null

  const title = metaContent(html, 'og:title') || username
  const description = blockText(html, 'tgme_page_description') || metaContent(html, 'og:description')

  return {
    username,
    title,
    description: description.slice(0, 600),
    type: counts.type,
    category: 'Discovered',
    language: guessLanguage(`${title} ${description}`),
    members: counts.members,
    online: counts.online,
    verified: html.includes('verified-icon'),
    photo: safeImage(metaContent(html, 'og:image')),
    link: `https://t.me/${username}`,
    source: 'live',
    live: true,
  }
}

export interface IndexHit {
  username: string
  title: string
  description: string
  type: ChatType
}

export function parseLyzem(html: string): IndexHit[] {
  const chunks = html.split('class="search-result"').slice(1)
  const hits: IndexHit[] = []
  const seen = new Set<string>()

  for (const chunk of chunks) {
    const typeMatch = chunk.match(/title="(channel|group)"/i)
    const href = chunk.match(/href="https:\/\/t\.me\/([A-Za-z][A-Za-z0-9_]{3,31})"/)
    if (!typeMatch?.[1] || !href?.[1]) continue
    const username = href[1]
    const key = username.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const title = decodeHtml(chunk.match(/search-result-title[\s\S]*?<a[^>]*>\s*([^<]+)/)?.[1] ?? username)
    const description = decodeHtml(
      chunk.match(/search-result-descr[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '',
    )
    hits.push({
      username,
      title: title || username,
      description: description.slice(0, 600),
      type: typeMatch[1].toLowerCase() === 'group' ? 'group' : 'channel',
    })
  }

  return hits
}

export function parseChannelPosts(html: string, username: string): PostPreview[] {
  const posts: PostPreview[] = []
  for (const chunk of html.split('data-post="').slice(1)) {
    const id = chunk.match(/^[^"]+\/(\d+)"/)?.[1]
    if (!id) continue
    const date = chunk.match(/<time[^>]*datetime="([^"]+)"/)?.[1] ?? null
    const textRaw = chunk.match(/js-message_text"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''
    const text = decodeHtml(textRaw, true).slice(0, 500)
    posts.push({
      id,
      text: text || 'Media post',
      date,
      link: `https://t.me/${username}/${id}`,
    })
  }
  return posts.slice(-5).reverse()
}

export function guessLanguage(text: string): string {
  const cyrillic = text.match(/[А-Яа-яЁё]/g)?.length ?? 0
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0
  if (cyrillic > 12 && cyrillic > latin) return 'ru'
  if (/\b(não|voce|você|brasil|notícias|noticias|para o)\b/i.test(text)) return 'pt'
  if (/\b(español|última hora|noticias de|más)\b/i.test(text)) return 'es'
  if (latin > 8) return 'en'
  return 'unknown'
}

export function scoreChat(chat: Chat, query: string): number {
  const normalized = query.trim().toLowerCase().replace(/^@/, '')
  if (!normalized) return 0

  const tokens = normalized.split(/\s+/).filter((token) => token.length > 0)
  const username = chat.username.toLowerCase()
  const title = chat.title.toLowerCase()
  const description = chat.description.toLowerCase()
  const category = chat.category.toLowerCase()
  let score = 0

  if (username === normalized) score += 120
  if (title === normalized) score += 100
  if (username.includes(normalized)) score += 36
  if (title.includes(normalized)) score += 34
  if (tokens.length > 1 && tokens.every((token) => title.includes(token) || username.includes(token))) {
    score += 48
  }
  if (tokens.some((token) => token.length > 2 && title.includes(token))) score += 18
  if (tokens.some((token) => token.length > 2 && username.includes(token))) score += 16
  if (tokens.some((token) => token.length > 2 && description.includes(token))) score += 14
  if (tokens.every((token) => description.includes(token))) score += 12
  if (category === normalized || tokens.includes(category)) score += 28

  return score
}

function pickSource(left: Chat['source'], right: Chat['source']): Chat['source'] {
  if (left === 'catalog' || right === 'catalog') return 'catalog'
  if (left === 'index' || right === 'index') return 'index'
  return 'live'
}

export function dedupeScored(items: ScoredChat[]): Chat[] {
  const byUser = new Map<string, ScoredChat>()

  for (const item of items) {
    const key = item.username.toLowerCase()
    const current = byUser.get(key)
    if (!current) {
      byUser.set(key, item)
      continue
    }

    const preferItem = item.score >= current.score
    const primary = preferItem ? item : current
    const secondary = preferItem ? current : item
    byUser.set(key, {
      ...primary,
      description: primary.description || secondary.description,
      category: primary.category !== 'Discovered' ? primary.category : secondary.category,
      language: primary.language !== 'unknown' ? primary.language : secondary.language,
      verified: primary.verified || secondary.verified,
      members: primary.live ? primary.members : secondary.live ? secondary.members : primary.members ?? secondary.members,
      online: primary.online ?? secondary.online,
      photo: primary.photo ?? secondary.photo,
      live: primary.live || secondary.live,
      source: pickSource(primary.source, secondary.source),
      score: Math.max(primary.score, secondary.score),
    })
  }

  return [...byUser.values()]
    .sort((a, b) => b.score - a.score || (b.members ?? 0) - (a.members ?? 0))
    .map((item) => ({
      username: item.username,
      title: item.title,
      description: item.description,
      type: item.type,
      category: item.category,
      language: item.language,
      members: item.members,
      online: item.online,
      verified: item.verified,
      photo: item.photo,
      link: item.link,
      source: item.source,
      live: item.live,
    }))
}
