import type { IncomingMessage, ServerResponse } from 'node:http'
import { getLlmConfig } from './config.ts'
import { probeLlm, runAgent } from './llm.ts'
import { checkTor } from './tor.ts'
import type { ChatMessage, ServerEvent } from './types.ts'

export function createApiMiddleware(env: Record<string, string>) {
  return function api(
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) {
    void handle(req, res, next, env).catch((error: unknown) => {
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
  env: Record<string, string>,
) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/')) {
    next()
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const cfg = getLlmConfig(env)
    sendJson(res, 200, {
      ok: true,
      name: 'DarkGPT',
      provider: cfg.provider,
      model: cfg.model,
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    const [tor, llm] = await Promise.all([checkTor(env), probeLlm(env)])
    sendJson(res, 200, { tor, llm })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    const body = await readJson(req)
    const messages = readMessages(body.messages)
    if (messages.length === 0) {
      sendJson(res, 400, { message: 'Envie uma mensagem.' })
      return
    }

    const controller = linkClient(req, res)
    startSse(res)
    try {
      await runAgent(env, messages, {
        onToken: (text) => writeEvent(res, { type: 'token', text }),
        onTool: (info) => writeEvent(res, { type: 'tool', ...info }),
        onStatus: (message) => writeEvent(res, { type: 'status', message }),
      })
      if (!controller.signal.aborted) writeEvent(res, { type: 'done' })
    } catch (error) {
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : 'Falha no DarkGPT.'
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
