import type { MediaKind } from './contracts.ts'

const IMAGE_EXT = /\.(avif|bmp|gif|jpe?g|png|webp)(?:$|[?#])/i
const VIDEO_EXT = /\.(m4v|mkv|mov|mp4|ogv|webm)(?:$|[?#])/i

export function mediaKindFromUrl(url: string): 'image' | 'video' | null {
  const path = url.split(/[?#]/)[0] ?? url
  if (VIDEO_EXT.test(path)) return 'video'
  if (IMAGE_EXT.test(path)) return 'image'
  return null
}

export function kindFromContentType(contentType: string): 'image' | 'video' | null {
  const base = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  if (base.startsWith('image/') && base !== 'image/svg+xml') return 'image'
  if (base.startsWith('video/')) return 'video'
  return null
}

export function embedFor(url: string | null | undefined): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '')
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const id = parsed.searchParams.get('v')
    if (id && /^[\w-]{6,}$/.test(id)) {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
    }
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0]
    if (id && /^[\w-]{6,}$/.test(id)) {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
    }
  }
  if (host === 'dailymotion.com') {
    const match = parsed.pathname.match(/\/video\/([^/?]+)/)
    if (match?.[1]) return `https://www.dailymotion.com/embed/video/${encodeURIComponent(match[1])}`
  }
  if (host === 'vimeo.com') {
    const match = parsed.pathname.match(/\/(\d+)/)
    if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`
  }
  if (parsed.protocol === 'https:' && parsed.pathname.includes('/videos/embed/')) return parsed.toString()
  return null
}

export function extensionFor(kind: MediaKind | null, contentType: string | null, url: string): string {
  const fromUrl = mediaKindFromUrl(url)
  const pathExt = (url.split(/[?#]/)[0] ?? '').split('.').pop()
  if (pathExt && /^(avif|bmp|gif|jpe?g|png|webp|m4v|mkv|mov|mp4|ogv|webm)$/i.test(pathExt)) {
    return pathExt.toLowerCase() === 'jpeg' ? 'jpg' : pathExt.toLowerCase()
  }
  const base = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
    'video/ogg': 'ogv',
  }
  if (map[base]) return map[base]
  if (fromUrl === 'video' || kind === 'video') return 'mp4'
  return 'jpg'
}
