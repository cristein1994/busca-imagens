import type { MediaFilter } from '../shared/contracts.ts'
import { plainTerms } from '../shared/dork.ts'
import { requestText } from './net.ts'
import { asHit, parseBing, parseHtml, type RawHit } from './parse.ts'

type FetchOpts = { torProxy: string | null; timeoutMs: number }

function preferOf(media: MediaFilter): 'image' | 'video' | 'any' {
  if (media === 'image') return 'image'
  if (media === 'video') return 'video'
  return 'any'
}

export async function htmlHits(url: string, media: MediaFilter, opts: FetchOpts): Promise<RawHit[]> {
  const response = await requestText(url, opts)
  if (response.status >= 400) throw new Error(`HTTP ${response.status}`)
  return parseHtml(response.text, preferOf(media))
}

export async function bingHits(query: string, media: MediaFilter, nsfw: boolean, opts: FetchOpts): Promise<RawHit[]> {
  const safe = nsfw ? 'off' : 'strict'
  const tasks: Promise<RawHit[]>[] = []
  if (media !== 'video') {
    tasks.push(loadBing(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&safesearch=${safe}`, 'image', opts))
  }
  if (media !== 'image') {
    tasks.push(loadBing(`https://www.bing.com/videos/search?q=${encodeURIComponent(query)}&safesearch=${safe}`, 'video', opts))
  }
  const groups = await Promise.all(tasks)
  return groups.flat().slice(0, 16)
}

async function loadBing(url: string, kind: 'image' | 'video', opts: FetchOpts): Promise<RawHit[]> {
  const response = await requestText(url, opts)
  if (response.status >= 400) throw new Error(`HTTP ${response.status}`)
  const hits = parseBing(response.text, kind)
  if (hits.length === 0 && response.text.length < 2000) throw new Error('Bing não devolveu mídia')
  return hits
}

export async function openverseHits(query: string, media: MediaFilter, opts: FetchOpts): Promise<RawHit[]> {
  if (media === 'video') return []
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(plainTerms(query))}&page_size=16`
  const data = await readJson(url, opts)
  const results = asArray(data.results)
  return results.slice(0, 16).map((item) =>
    asHit({
      title: text(item.title, 'Openverse'),
      pageUrl: text(item.foreign_landing_url, text(item.url, 'https://openverse.org')),
      mediaUrl: text(item.url, '') || null,
      thumbUrl: text(item.thumbnail, '') || null,
      kind: 'image',
      snippet: text(item.creator, ''),
    }),
  ).filter((hit) => hit.mediaUrl)
}

export async function wikimediaHits(query: string, media: MediaFilter, opts: FetchOpts): Promise<RawHit[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: plainTerms(query),
    gsrlimit: '12',
    gsrnamespace: '6',
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: '420',
    origin: '*',
  })
  const data = await readJson(`https://commons.wikimedia.org/w/api.php?${params}`, opts)
  const pages = data.query && typeof data.query === 'object' ? (data.query as { pages?: Record<string, Json> }).pages : undefined
  if (!pages) return []
  const hits: RawHit[] = []
  for (const page of Object.values(pages)) {
    if (!page || typeof page !== 'object') continue
    const info = asArray((page as { imageinfo?: unknown }).imageinfo)[0]
    if (!info) continue
    const mime = text(info.mime, '')
    const kind = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'image' : null
    if (!kind) continue
    if (media === 'image' && kind !== 'image') continue
    if (media === 'video' && kind !== 'video') continue
    const title = text((page as { title?: unknown }).title, 'Wikimedia')
    hits.push(asHit({
      title: title.replace(/^File:/, ''),
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      mediaUrl: text(info.url, '') || null,
      thumbUrl: text(info.thumburl, '') || null,
      kind,
      snippet: mime,
    }))
  }
  return hits
}

export async function archiveHits(query: string, media: MediaFilter, opts: FetchOpts): Promise<RawHit[]> {
  const mediatype = media === 'image' ? 'image' : media === 'video' ? 'movies' : '(image OR movies)'
  const q = `${plainTerms(query)} AND mediatype:${mediatype}`
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=mediatype&output=json&rows=12`
  const data = await readJson(url, opts)
  const docs = asArray((data.response as { docs?: unknown } | undefined)?.docs)
  return docs.slice(0, 12).map((doc) => {
    const identifier = text(doc.identifier, '')
    const mediatypeName = text(doc.mediatype, '')
    const kind = mediatypeName === 'movies' ? 'video' : 'image'
    return asHit({
      title: text(doc.title, identifier || 'Internet Archive'),
      pageUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
      mediaUrl: null,
      thumbUrl: identifier ? `https://archive.org/services/img/${encodeURIComponent(identifier)}` : null,
      kind,
      snippet: mediatypeName,
    })
  }).filter((hit) => hit.pageUrl.includes('/details/') && !hit.pageUrl.endsWith('/details/'))
}

export async function flickrHits(query: string, opts: FetchOpts): Promise<RawHit[]> {
  const tags = plainTerms(query).split(' ').slice(0, 4).join(',')
  if (!tags) return []
  const response = await requestText(
    `https://www.flickr.com/services/feeds/photos_public.gne?format=json&nojsoncallback=1&tags=${encodeURIComponent(tags)}`,
    opts,
  )
  if (response.status >= 400) throw new Error(`HTTP ${response.status}`)
  const data = JSON.parse(response.text) as { items?: Json[] }
  return asArray(data.items).slice(0, 12).map((item) => {
    const media = item.media && typeof item.media === 'object' ? text((item.media as { m?: unknown }).m, '') : ''
    const link = text(item.link, media)
    return asHit({
      title: text(item.title, 'Flickr'),
      pageUrl: link || 'https://www.flickr.com',
      mediaUrl: media || null,
      thumbUrl: media || null,
      kind: 'image',
    })
  }).filter((hit) => hit.mediaUrl)
}

export async function nasaHits(query: string, media: MediaFilter, opts: FetchOpts): Promise<RawHit[]> {
  const type = media === 'both' ? '' : `&media_type=${media === 'video' ? 'video' : 'image'}`
  const data = await readJson(
    `https://images-api.nasa.gov/search?q=${encodeURIComponent(plainTerms(query))}${type}`,
    opts,
  )
  const items = asArray((data.collection as { items?: unknown } | undefined)?.items)
  return items.slice(0, 12).map((item) => {
    const meta = asArray(item.data)[0] ?? {}
    const links = asArray(item.links)
    const kind = text(meta.media_type, 'image') === 'video' ? 'video' : 'image'
    const canonical = links.find((link) => text(link.rel, '') === 'canonical') ?? links[0]
    const preview = links.find((link) => text(link.rel, '') === 'preview') ?? canonical
    return asHit({
      title: text(meta.title, 'NASA'),
      pageUrl: text(item.href, text(canonical?.href, 'https://images.nasa.gov')),
      mediaUrl: kind === 'image' ? text(canonical?.href, '') || null : null,
      thumbUrl: text(preview?.href, '') || null,
      kind,
      snippet: text(meta.description, '').slice(0, 180),
    })
  })
}

export async function redditHits(query: string, nsfw: boolean, opts: FetchOpts): Promise<RawHit[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(plainTerms(query))}&limit=15&raw_json=1&include_over_18=${nsfw ? 'on' : 'off'}&type=link`
  const response = await requestText(url, opts)
  if (response.status >= 400) throw new Error(`HTTP ${response.status}`)
  if (!response.text.trim().startsWith('{')) throw new Error('Reddit recusou a consulta automática')
  const data = JSON.parse(response.text) as { data?: { children?: { data?: Json }[] } }
  const children = data.data?.children ?? []
  const hits: RawHit[] = []
  for (const child of children) {
    const post = child.data
    if (!post) continue
    if (!nsfw && post.over_18 === true) continue
    const pageUrl = text(post.url_overridden_by_dest, text(post.url, ''))
    const preview = post.preview && typeof post.preview === 'object'
      ? asArray((post.preview as { images?: Json[] }).images)[0]
      : undefined
    const source = preview && typeof preview.source === 'object' ? text((preview.source as { url?: unknown }).url, '') : ''
    const kind = mediaKind(pageUrl, text(post.post_hint, ''))
    if (!pageUrl) continue
    hits.push(asHit({
      title: text(post.title, 'Reddit'),
      pageUrl: pageUrl.startsWith('http') ? pageUrl : `https://www.reddit.com${text(post.permalink, '')}`,
      mediaUrl: kind === 'page' ? null : pageUrl,
      thumbUrl: source || null,
      kind,
      snippet: text(post.subreddit_name_prefixed, ''),
    }))
  }
  return hits.slice(0, 12)
}

function mediaKind(url: string, hint: string): 'image' | 'video' | 'page' {
  if (hint.includes('image') || /\.(jpe?g|png|gif|webp)(?:$|[?#])/i.test(url)) return 'image'
  if (hint.includes('video') || /\.(mp4|webm|mov)(?:$|[?#])/i.test(url) || /youtube|youtu\.be|vimeo|dailymotion/.test(url)) {
    return 'video'
  }
  return 'page'
}

export async function dailymotionHits(query: string, opts: FetchOpts): Promise<RawHit[]> {
  const url = `https://api.dailymotion.com/videos?search=${encodeURIComponent(plainTerms(query))}&fields=id,title,thumbnail_240_url,url&limit=12`
  const data = await readJson(url, opts)
  return asArray(data.list).map((item) => {
    const id = text(item.id, '')
    const pageUrl = text(item.url, id ? `https://www.dailymotion.com/video/${id}` : 'https://www.dailymotion.com')
    return asHit({
      title: text(item.title, 'Dailymotion'),
      pageUrl,
      mediaUrl: null,
      thumbUrl: text(item.thumbnail_240_url, '') || null,
      embedUrl: id ? `https://www.dailymotion.com/embed/video/${id}` : null,
      kind: 'video',
    })
  })
}

export async function sepiasearchHits(query: string, nsfw: boolean, opts: FetchOpts): Promise<RawHit[]> {
  const url = `https://sepiasearch.org/api/v1/search/videos?search=${encodeURIComponent(plainTerms(query))}&count=12&nsfw=${nsfw ? 'true' : 'false'}`
  const data = await readJson(url, opts)
  return asArray(data.data)
    .filter((item) => nsfw || item.nsfw !== true)
    .map((item) => asHit({
      title: text(item.name, 'PeerTube'),
      pageUrl: text(item.url, 'https://sepiasearch.org'),
      mediaUrl: null,
      thumbUrl: text(item.thumbnailUrl, '') || null,
      embedUrl: text(item.embedUrl, '') || null,
      kind: 'video',
      snippet: text(item.truncatedDescription, '').slice(0, 180),
    }))
}

const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee',
]

export async function pipedHits(query: string, opts: FetchOpts): Promise<RawHit[]> {
  let last = 'Piped indisponível'
  for (const base of PIPED) {
    try {
      const data = await readJson(`${base}/search?q=${encodeURIComponent(plainTerms(query))}&filter=videos`, opts)
      const items = Array.isArray(data) ? data : asArray((data as { items?: unknown }).items)
      const hits = items
        .filter((item) => text(item.type, 'video') === 'video' || text(item.url, '').includes('watch'))
        .slice(0, 12)
        .map((item) => {
          const watch = text(item.url, '')
          const id = /v=([\w-]{6,})/.exec(watch)?.[1] ?? ''
          const pageUrl = id ? `https://www.youtube.com/watch?v=${id}` : watch
          return asHit({
            title: text(item.title, 'Vídeo'),
            pageUrl: pageUrl.startsWith('http') ? pageUrl : `https://www.youtube.com${pageUrl}`,
            mediaUrl: null,
            thumbUrl: text(item.thumbnail, '') || null,
            kind: 'video',
            snippet: text(item.uploaderName, text(item.duration, '')),
          })
        })
        .filter((hit) => hit.pageUrl.startsWith('http'))
      if (hits.length > 0) return hits
      last = 'Piped sem vídeos'
    } catch (error) {
      last = error instanceof Error ? error.message : 'Piped falhou'
    }
  }
  throw new Error(last)
}

type Json = Record<string, unknown>

async function readJson(url: string, opts: FetchOpts): Promise<Json> {
  const response = await requestText(url, opts)
  if (response.status >= 400) throw new Error(`HTTP ${response.status}`)
  const data: unknown = JSON.parse(response.text)
  if (Array.isArray(data)) return { items: data }
  if (!data || typeof data !== 'object') throw new Error('JSON inválido')
  return data as Json
}

function asArray(value: unknown): Json[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Json => Boolean(item) && typeof item === 'object')
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}
