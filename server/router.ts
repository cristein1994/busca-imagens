import type { IncomingMessage, ServerResponse } from 'node:http'
import { emptyDork, type DorkFields, type MediaFilter, type SearchMode, type SearchRequest } from '../shared/contracts.ts'
import { ENGINES, engineInfo } from './engines.ts'
import { HttpError } from './net.ts'
import { inspectMedia, sendMedia } from './media.ts'
import { SearchRejected, runSearch } from './search.ts'
import { detectTor } from './tor.ts'

export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.url ?? '/', `http://${host}`)
  if (!url.pathname.startsWith('/api/')) return false
  try {
    if (req.method === 'GET' && url.pathname === '/api/engines') {
      sendJson(res, 200, {
        engines: ENGINES.map(engineInfo),
        surface: ENGINES.filter((engine) => engine.network === 'surface').length,
        onion: ENGINES.filter((engine) => engine.network === 'onion').length,
      })
      return true
    }
    if (req.method === 'GET' && url.pathname === '/api/tor') {
      sendJson(res, 200, await detectTor(url.searchParams.get('probe') === '1'))
      return true
    }
    if (req.method === 'POST' && url.pathname === '/api/search') {
      const body = parseSearchRequest(JSON.parse(await readBody(req)))
      sendJson(res, 200, await runSearch(body))
      return true
    }
    if (req.method === 'GET' && (url.pathname === '/api/inspect' || url.pathname === '/api/preview' || url.pathname === '/api/download')) {
      const target = url.searchParams.get('url')?.trim() ?? ''
      if (!target) throw new HttpError('Informe a URL.')
      const tor = await detectTor(false)
      if (url.pathname === '/api/inspect') {
        sendJson(res, 200, await inspectMedia(target, tor))
        return true
      }
      await sendMedia(target, tor, res, url.pathname === '/api/download' ? 'attachment' : 'inline')
      return true
    }
    sendJson(res, 404, { error: 'Rota não encontrada.' })
  } catch (error) {
    if (error instanceof SearchRejected) {
      sendJson(res, 422, { error: error.message })
      return true
    }
    const status = error instanceof HttpError ? 400 : error instanceof SyntaxError ? 400 : 500
    const message = error instanceof Error ? error.message : 'Falha interna.'
    if (!res.headersSent) sendJson(res, status, { error: message.slice(0, 240) })
    else res.destroy()
  }
  return true
}

function parseSearchRequest(value: unknown): SearchRequest {
  if (!value || typeof value !== 'object') throw new HttpError('JSON inválido')
  const body = value as Partial<SearchRequest>
  const mode: SearchMode = body.mode === 'content' ? 'content' : 'metadata'
  const media: MediaFilter = body.media === 'image' || body.media === 'video' ? body.media : 'both'
  const dork = { ...emptyDork(), ...(body.dork ?? {}) }
  const cleanDork = Object.fromEntries(
    Object.entries(dork).map(([key, field]) => [key, typeof field === 'string' ? field.slice(0, 120) : '']),
  ) as DorkFields
  const engineIds = Array.isArray(body.engineIds)
    ? body.engineIds.filter((id): id is string => typeof id === 'string').slice(0, 80)
    : undefined
  return {
    query: typeof body.query === 'string' ? body.query.slice(0, 240) : '',
    mode,
    media,
    nsfw: Boolean(body.nsfw),
    dork: cleanDork,
    engineIds,
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 40_000) {
        reject(new HttpError('Pedido grande demais'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(data))
}
