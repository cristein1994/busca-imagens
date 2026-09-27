import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import { handleGrokRequest, type GrokConfig } from './grok.ts'

const MAX_BODY_BYTES = 64_000

export function createGrokMiddleware(config: GrokConfig): Connect.NextHandleFunction {
  return (req, res, next) => {
    const path = req.url?.split('?')[0]
    if (path !== '/api/grok') {
      next()
      return
    }

    void handleRequest(req, res, config).catch((err: unknown) => {
      if (isPayloadTooLarge(err)) {
        sendJson(res, 413, { error: 'Mensagem grande demais.' })
        return
      }
      next(err instanceof Error ? err : new Error('Erro interno do Grok.'))
    })
  }
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: GrokConfig,
): Promise<void> {
  const method = req.method ?? 'GET'
  const body = method.toUpperCase() === 'POST' ? await readBody(req) : undefined
  const result = await handleGrokRequest({ method, body, config })
  sendJson(res, result.status, result.body)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0

    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('payload'), { code: 'PAYLOAD_TOO_LARGE' }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function isPayloadTooLarge(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && err.code === 'PAYLOAD_TOO_LARGE'
}
