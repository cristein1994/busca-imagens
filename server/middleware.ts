import type { IncomingMessage, ServerResponse } from 'node:http'
import { runDeepSearch } from './deepSearch.ts'
import { streamChat, resolveBaseUrl, sanitizeModel } from './deepseek.ts'
import { deleteLibraryItem, listLibrary, saveLibraryItem } from './library.ts'
import { readModelfile, writeModelfile } from './modelfile.ts'
import type { ChatMessage, ServerEvent, Source } from './types.ts'
import { readPage } from './web.ts'

type Env = {
  DEEPSEEK_API_KEY?: string
  DEEPSEEK_BASE_URL?: string
}

export function createApiMiddleware(env: Env) {
  const apiKey = (env.DEEPSEEK_API_KEY ?? '').trim()
  const baseUrl = resolveBaseUrl(env.DEEPSEEK_BASE_URL)

  return function api(
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) {
    void handle(req, res, next, apiKey, baseUrl).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Erro interno.'
      if (res.headersSent) {
        writeEvent(res, { type: 'error', message })
        res.end()
        return
      }
      sendJson(res, 500, { message })
    })
  }
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
  apiKey: string,
  baseUrl: string,
) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/')) {
    next()
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, configured: apiKey.length > 0 })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/modelfile') {
    sendJson(res, 200, await readModelfile())
    return
  }

  if (req.method === 'PUT' && url.pathname === '/api/modelfile') {
    const body = await readJson(req)
    const raw = readString(body, 'raw')
    if (!raw.trim()) {
      sendJson(res, 400, { message: 'O modelfile está vazio.' })
      return
    }
    sendJson(res, 200, await writeModelfile(raw))
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/library') {
    sendJson(res, 200, { items: await listLibrary() })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/library') {
    const body = await readJson(req)
    const kind = body.kind === 'page' || body.kind === 'report' ? body.kind : null
    const content = readString(body, 'content')
    if (!kind || !content.trim()) {
      sendJson(res, 400, { message: 'Nada para guardar.' })
      return
    }
    const pageUrl = readString(body, 'url')
    if (pageUrl && !isPublicWebUrl(pageUrl)) {
      sendJson(res, 400, { message: 'A URL para guardar precisa ser http ou https.' })
      return
    }
    const item = await saveLibraryItem({
      kind,
      title: readString(body, 'title'),
      url: pageUrl,
      content,
      query: readString(body, 'query'),
      sources: readSources(body.sources),
    })
    sendJson(res, 201, { item })
    return
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/library/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/library/'.length))
    if (!id) {
      sendJson(res, 400, { message: 'Item sem id.' })
      return
    }
    const removed = await deleteLibraryItem(id)
    sendJson(res, removed ? 200 : 404, { ok: removed })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/fetch') {
    const body = await readJson(req)
    const pageUrl = readString(body, 'url')
    try {
      sendJson(res, 200, await readPage(pageUrl))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível ler a página.'
      sendJson(res, 400, { message })
    }
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    if (!apiKey) {
      sendJson(res, 503, { message: 'Defina DEEPSEEK_API_KEY no arquivo .env e reinicie.' })
      return
    }
    const body = await readJson(req)
    const messages = readMessages(body.messages)
    if (messages.length === 0) {
      sendJson(res, 400, { message: 'Envie uma mensagem.' })
      return
    }
    const controller = linkClient(req, res)
    startSse(res)
    try {
      await streamChat({
        apiKey,
        baseUrl,
        model: sanitizeModel(body.model),
        temperature: readTemperature(body.temperature),
        system: readString(body, 'system'),
        messages,
        signal: controller.signal,
        onDelta: (delta) => {
          if (delta.reasoning) writeEvent(res, { type: 'reasoning', content: delta.reasoning })
          if (delta.content) writeEvent(res, { type: 'delta', content: delta.content })
        },
      })
      writeEvent(res, { type: 'done' })
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Falha ao falar com a DeepSeek.'
      writeEvent(res, { type: 'error', message })
    } finally {
      res.end()
    }
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/deep-search') {
    const body = await readJson(req)
    const query = readString(body, 'query')
    const controller = linkClient(req, res)
    startSse(res)
    try {
      await runDeepSearch({
        query,
        model: sanitizeModel(body.model),
        system: readString(body, 'system'),
        temperature: readTemperature(body.temperature),
        apiKey,
        baseUrl,
        signal: controller.signal,
        emit: (event) => writeEvent(res, event),
      })
    } catch (error) {
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : 'A Deep Search falhou.'
        writeEvent(res, { type: 'error', message })
      }
    } finally {
      res.end()
    }
    return
  }

  sendJson(res, 404, { message: 'Rota não encontrada.' })
}

function linkClient(req: IncomingMessage, res: ServerResponse): AbortController {
  const controller = new AbortController()
  req.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })
  return controller
}

function startSse(res: ServerResponse) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })
}

function writeEvent(res: ServerResponse, event: ServerEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readBody(req)
  if (!raw.trim()) return {}
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON inválido.')
  }
  return parsed as Record<string, unknown>
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 1_000_000) {
        reject(new Error('Corpo grande demais.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}

function readTemperature(value: unknown): number {
  const temperature = typeof value === 'number' ? value : 0.7
  if (!Number.isFinite(temperature)) return 0.7
  return Math.min(2, Math.max(0, temperature))
}

function readMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  const messages: ChatMessage[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const role = (entry as { role?: unknown }).role
    const content = (entry as { content?: unknown }).content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue
    if (!content.trim()) continue
    messages.push({ role, content })
  }
  return messages
}

function readSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return []
  const sources: Source[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const url = (entry as { url?: unknown }).url
    if (typeof url !== 'string' || !isPublicWebUrl(url)) continue
    const title = (entry as { title?: unknown }).title
    const snippet = (entry as { snippet?: unknown }).snippet
    sources.push({
      title: typeof title === 'string' ? title : url,
      url,
      snippet: typeof snippet === 'string' ? snippet : '',
    })
  }
  return sources
}

function isPublicWebUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
