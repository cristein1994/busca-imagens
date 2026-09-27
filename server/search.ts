import type { Chat, ChatResponse, ChatType, SearchResponse } from '../shared/chat.ts'
import { catalog } from './catalog.ts'
import {
  dedupeScored,
  extractHandle,
  guessLanguage,
  parseChannelPosts,
  parseLyzem,
  parseTelegramPage,
  scoreChat,
  type ScoredChat,
} from './parse.ts'

const HOSTS = new Set(['t.me', 'www.t.me', 'lyzem.com', 'www.lyzem.com'])
const SEARCH_TTL_MS = 3 * 60 * 1000
const PROFILE_TTL_MS = 10 * 60 * 1000

const searchCache = new Map<string, { at: number; data: SearchResponse }>()
const profileCache = new Map<string, { at: number; chat: Chat | null }>()

async function fetchHtml(url: string, timeoutMs: number, hops = 0): Promise<string | null> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || !HOSTS.has(parsed.hostname)) return null

  const response = await fetch(parsed, {
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'ChannelEngine/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (response.status >= 300 && response.status < 400) {
    if (hops >= 2) return null
    const location = response.headers.get('location')
    if (!location) return null
    const next = new URL(location, parsed)
    if (next.hostname === 'telegram.org' || next.hostname === 'www.telegram.org') return null
    return fetchHtml(next.toString(), timeoutMs, hops + 1)
  }

  if (!response.ok) return null
  return response.text()
}

export async function resolveUsername(username: string): Promise<Chat | null> {
  if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(username)) return null
  const key = username.toLowerCase()
  const cached = profileCache.get(key)
  if (cached && Date.now() - cached.at < PROFILE_TTL_MS) return cached.chat

  const html = await fetchHtml(`https://t.me/${encodeURIComponent(username)}`, 7000)
  const parsed = html ? parseTelegramPage(html, username) : null
  const known = catalog.find((chat) => chat.username.toLowerCase() === key)
  const chat = parsed
    ? {
        ...parsed,
        category: known?.category ?? parsed.category,
        language: known?.language ?? parsed.language,
        source: known ? 'catalog' as const : parsed.source,
      }
    : null

  profileCache.set(key, { at: Date.now(), chat })
  return chat
}

async function discover(query: string, type: 'all' | ChatType): Promise<ScoredChat[]> {
  const filters = type === 'channel' ? ['channels'] : type === 'group' ? ['groups'] : ['channels', 'groups']
  const settled = await Promise.allSettled(
    filters.map(async (filter) => {
      const html = await fetchHtml(
        `https://lyzem.com/search?q=${encodeURIComponent(query)}&f=${filter}`,
        7000,
      )
      if (!html || !html.includes('search-result')) throw new Error('index unavailable')
      return parseLyzem(html)
    }),
  )

  const fulfilled = settled.filter((result) => result.status === 'fulfilled')
  if (fulfilled.length === 0) throw new Error('index unavailable')

  const hits = fulfilled.flatMap((result) => result.value)
  return hits.flatMap((hit, index) => {
    const known = catalog.find((chat) => chat.username.toLowerCase() === hit.username.toLowerCase())
    const chat: Chat = known
      ? {
          ...known,
          title: hit.title || known.title,
          description: hit.description || known.description,
          type: hit.type,
        }
      : {
          username: hit.username,
          title: hit.title || hit.username,
          description: hit.description,
          type: hit.type,
          category: 'Discovered',
          language: guessLanguage(`${hit.title} ${hit.description}`),
          members: null,
          online: null,
          verified: false,
          photo: null,
          link: `https://t.me/${hit.username}`,
          source: 'index',
          live: false,
        }
    if (type !== 'all' && chat.type !== type) return []
    return [{ ...chat, score: Math.max(20, 72 - index * 3) }]
  })
}

async function enrichSome(chats: Chat[], limit: number): Promise<Chat[]> {
  const head = chats.slice(0, limit)
  const tail = chats.slice(limit)
  const enriched = await Promise.all(
    head.map(async (chat) => {
      try {
        const fresh = await resolveUsername(chat.username)
        if (!fresh) return chat
        return {
          ...chat,
          title: fresh.title || chat.title,
          description: fresh.description || chat.description,
          type: fresh.type,
          members: fresh.members,
          online: fresh.online,
          verified: fresh.verified,
          photo: fresh.photo,
          live: true,
          category: chat.category !== 'Discovered' ? chat.category : fresh.category,
          language: chat.language !== 'unknown' ? chat.language : fresh.language,
          source: chat.source,
        }
      } catch {
        return chat
      }
    }),
  )
  return [...enriched, ...tail]
}

export async function searchChats(rawQuery: string, type: 'all' | ChatType): Promise<SearchResponse> {
  const query = rawQuery.trim().slice(0, 80)
  const cacheKey = `${type}::${query.toLowerCase()}`
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.at < SEARCH_TTL_MS) return cached.data

  if (!query) {
    const data: SearchResponse = {
      query: '',
      results: catalog
        .filter((chat) => type === 'all' || chat.type === type)
        .sort((a, b) => (b.members ?? 0) - (a.members ?? 0)),
      warning: null,
      index: 'skipped',
      catalogSize: catalog.length,
    }
    searchCache.set(cacheKey, { at: Date.now(), data })
    return data
  }

  const catalogHits: ScoredChat[] = catalog
    .map((chat) => ({ ...chat, score: scoreChat(chat, query) }))
    .filter((chat) => chat.score > 0 && (type === 'all' || chat.type === type))

  const discovery = query.length >= 2
    ? discover(query, type).then(
        (hits) => ({ hits, index: 'ok' as const, warning: null as string | null }),
        () => ({
          hits: [] as ScoredChat[],
          index: 'unavailable' as const,
          warning: 'The public web index is unavailable. Showing catalog matches only.',
        }),
      )
    : Promise.resolve({
        hits: [] as ScoredChat[],
        index: 'skipped' as const,
        warning: null as string | null,
      })

  const handle = extractHandle(query)
  const [found, resolved] = await Promise.all([
    discovery,
    handle ? resolveUsername(handle).catch(() => null) : Promise.resolve(null),
  ])

  const liveHit = resolved && (type === 'all' || resolved.type === type)
    ? [{ ...resolved, score: 160 }]
    : []

  const merged = dedupeScored([...catalogHits, ...found.hits, ...liveHit]).slice(0, 24)
  const enriched = await enrichSome(merged, 8)
  const data: SearchResponse = {
    query,
    results: type === 'all' ? enriched : enriched.filter((chat) => chat.type === type),
    warning: found.warning,
    index: found.index,
    catalogSize: catalog.length,
  }

  if (found.index !== 'unavailable') {
    searchCache.set(cacheKey, { at: Date.now(), data })
  }
  return data
}

export async function getChat(username: string): Promise<ChatResponse | null> {
  const chat = await resolveUsername(username)
  if (!chat) return null

  let posts: ChatResponse['posts'] = []
  let postsNote: string | null = null
  try {
    const html = await fetchHtml(`https://t.me/s/${encodeURIComponent(chat.username)}`, 7000)
    posts = html ? parseChannelPosts(html, chat.username) : []
    if (posts.length === 0) {
      postsNote = chat.type === 'group'
        ? 'This group has no public web preview.'
        : 'No public posts were available to preview.'
    }
  } catch {
    postsNote = 'The public post preview could not be loaded.'
  }

  return { chat, posts, postsNote }
}
