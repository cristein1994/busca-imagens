import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ViteDevServer } from 'vite'
import { dispatch } from '../shared/commands.ts'
import { apiKey, keyConfigured, loadProjectEnv } from './env.ts'
import { GrokError } from './grok.ts'
import { runTurn } from './chat.ts'
import { loadSession, saveSession } from './sessionStore.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 1_000_000) {
        reject(new Error('corpo grande demais'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function contentType(file: string): string {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8'
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (file.endsWith('.css')) return 'text/css; charset=utf-8'
  if (file.endsWith('.svg')) return 'image/svg+xml'
  if (file.endsWith('.json')) return 'application/json; charset=utf-8'
  return 'application/octet-stream'
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (url.pathname === '/api/session' && req.method === 'GET') {
    sendJson(res, 200, { session: loadSession(root), keyConfigured: keyConfigured() })
    return true
  }

  if (url.pathname === '/api/command' && req.method === 'POST') {
    const raw = await readBody(req)
    const body = JSON.parse(raw || '{}') as { line?: string }
    const line = typeof body.line === 'string' ? body.line : ''
    const session = loadSession(root)
    const outcome = dispatch(session, line)
    if (!outcome.handled) {
      sendJson(res, 400, { error: 'não é um comando' })
      return true
    }
    saveSession(root, session)
    sendJson(res, 200, { session, exit: Boolean(outcome.exit), note: outcome.note ?? '' })
    return true
  }

  if (url.pathname === '/api/chat' && req.method === 'POST') {
    const raw = await readBody(req)
    const body = JSON.parse(raw || '{}') as { text?: string }
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) {
      sendJson(res, 400, { error: 'texto vazio' })
      return true
    }
    if (!keyConfigured()) {
      sendJson(res, 400, {
        error: 'XAI_API_KEY ausente. Crie uma chave em https://console.x.ai e coloque no .env.',
      })
      return true
    }

    const session = loadSession(root)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    const abort = new AbortController()
    req.on('close', () => abort.abort())

    try {
      for await (const event of runTurn({
        root,
        session,
        text,
        apiKey: apiKey(),
        signal: abort.signal,
      })) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        const message = error instanceof GrokError || error instanceof Error ? error.message : 'falha'
        res.write(`data: ${JSON.stringify({ kind: 'error', message })}\n\n`)
      }
    }
    res.end()
    return true
  }

  return false
}

function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const dist = path.join(root, 'dist')
  const requested = path.normalize(path.join(dist, decodeURIComponent(url.pathname)))
  const file = requested.startsWith(dist) && existsSync(requested) && statSync(requested).isFile()
    ? requested
    : path.join(dist, 'index.html')
  if (!existsSync(file)) {
    sendJson(res, 404, { error: 'build ausente. rode npm run build' })
    return
  }
  res.writeHead(200, { 'Content-Type': contentType(file) })
  createReadStream(file).pipe(res)
}

export async function startServer(port = Number(process.env.PORT || 5173)) {
  loadProjectEnv(root)
  const prod = process.env.NODE_ENV === 'production'
  let vite: ViteDevServer | null = null
  if (!prod) {
    const { createServer: createViteServer } = await import('vite')
    vite = await createViteServer({
      root,
      server: { middlewareMode: true, host: true, allowedHosts: true },
      appType: 'spa',
    })
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname.startsWith('/api/')) {
        const handled = await handleApi(req, res, url)
        if (handled) return
      }
      if (vite) {
        vite.middlewares(req, res, () => {
          sendJson(res, 404, { error: 'não encontrado' })
        })
        return
      }
      serveStatic(req, res)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro'
      if (!res.headersSent) sendJson(res, 500, { error: message })
      else res.end()
    }
  })

  await new Promise<void>((resolve) => server.listen(port, '0.0.0.0', resolve))
  return { server, port, vite }
}
