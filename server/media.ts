import { once } from 'node:events'
import { Readable, Transform } from 'node:stream'
import type { ServerResponse } from 'node:http'
import type { InspectResponse, MediaKind } from '../shared/contracts.ts'
import { extensionFor, kindFromContentType, mediaKindFromUrl } from '../shared/media.ts'
import { isBlockedSearch } from '../shared/safety.ts'
import { HttpError, requestMedia } from './net.ts'
import type { TorStatus } from '../shared/contracts.ts'

const MAX_BYTES = 200 * 1024 * 1024

export async function inspectMedia(raw: string, tor: TorStatus): Promise<InspectResponse> {
  if (isBlockedSearch(raw, true)) {
    return {
      url: raw,
      downloadable: false,
      contentType: null,
      bytes: null,
      kind: null,
      detail: 'URL recusada.',
    }
  }
  try {
    const response = await requestMedia(raw, { torProxy: tor.ok ? tor.proxy : null, timeoutMs: 12000 })
    const contentType = response.headers.get('content-type')
    const lengthHeader = response.headers.get('content-length')
    const bytes = lengthHeader ? Number(lengthHeader) : null
    await response.body?.cancel()
    if (response.status >= 400) {
      return {
        url: response.finalUrl,
        downloadable: false,
        contentType,
        bytes: Number.isFinite(bytes) ? bytes : null,
        kind: null,
        detail: `O servidor respondeu HTTP ${response.status}.`,
      }
    }
    const kind = resolveKind(contentType, response.finalUrl)
    if (!kind || kind === 'page') {
      return {
        url: response.finalUrl,
        downloadable: false,
        contentType,
        bytes: Number.isFinite(bytes) ? bytes : null,
        kind: null,
        detail: 'A URL não é um arquivo de imagem ou vídeo.',
      }
    }
    if (bytes !== null && bytes > MAX_BYTES) {
      return {
        url: response.finalUrl,
        downloadable: false,
        contentType,
        bytes,
        kind,
        detail: 'Arquivo acima de 200 MB.',
      }
    }
    return {
      url: response.finalUrl,
      downloadable: true,
      contentType,
      bytes: Number.isFinite(bytes) ? bytes : null,
      kind,
      detail: 'Arquivo de mídia. Dá para ver e baixar por aqui.',
    }
  } catch (error) {
    return {
      url: raw,
      downloadable: false,
      contentType: null,
      bytes: null,
      kind: null,
      detail: error instanceof Error ? error.message : 'Não foi possível ler a URL.',
    }
  }
}

export async function sendMedia(raw: string, tor: TorStatus, res: ServerResponse, disposition: 'inline' | 'attachment') {
  if (isBlockedSearch(raw, true)) throw new HttpError('URL recusada.')
  const response = await requestMedia(raw, { torProxy: tor.ok ? tor.proxy : null, timeoutMs: 20000 })
  if (response.status >= 400 || !response.body) throw new HttpError(`HTTP ${response.status}`)
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  const kind = resolveKind(contentType, response.finalUrl)
  if (!kind || kind === 'page') throw new HttpError('A URL não é um arquivo de imagem ou vídeo.')
  const lengthHeader = response.headers.get('content-length')
  const bytes = lengthHeader ? Number(lengthHeader) : null
  if (bytes !== null && bytes > MAX_BYTES) throw new HttpError('Arquivo acima de 200 MB.')
  const filename = safeFilename(response.finalUrl, kind, contentType)
  res.writeHead(200, {
    'content-type': contentType.split(';')[0] || 'application/octet-stream',
    'content-disposition': `${disposition}; filename="${filename}"`,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...(bytes !== null && Number.isFinite(bytes) ? { 'content-length': String(bytes) } : {}),
  })
  const source = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)
  const limited = source.pipe(limitBytes(MAX_BYTES))
  for await (const chunk of limited) {
    if (!res.write(chunk)) await once(res, 'drain')
  }
  res.end()
}

function resolveKind(contentType: string | null, url: string): MediaKind | null {
  const fromType = contentType ? kindFromContentType(contentType) : null
  if (fromType) return fromType
  const base = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (base === 'application/octet-stream' || base === 'binary/octet-stream' || base === '') {
    return mediaKindFromUrl(url)
  }
  return mediaKindFromUrl(url)
}

function limitBytes(max: number): Transform {
  let total = 0
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      total += chunk.length
      if (total > max) callback(new Error('Arquivo acima de 200 MB.'))
      else callback(null, chunk)
    },
  })
}

function safeFilename(url: string, kind: MediaKind, contentType: string): string {
  const ext = extensionFor(kind, contentType, url)
  let stem = 'lente-midia'
  try {
    const last = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '')
    const cleaned = last.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '')
    if (cleaned) stem = cleaned.slice(0, 80)
  } catch {
    stem = 'lente-midia'
  }
  return `${stem}.${ext}`
}
