import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import type { ChatType } from '../shared/chat.ts'
import { getChat, searchChats } from './search.ts'

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function handle(req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) {
  const raw = req.url ?? ''
  if (!raw.startsWith('/api/')) {
    next()
    return
  }

  const url = new URL(raw, 'http://127.0.0.1')
  try {
    if (url.pathname === '/api/search') {
      const typeParam = url.searchParams.get('type') ?? 'all'
      const type: 'all' | ChatType = typeParam === 'channel' || typeParam === 'group' ? typeParam : 'all'
      send(res, 200, await searchChats(url.searchParams.get('q') ?? '', type))
      return
    }

    if (url.pathname === '/api/chat') {
      const data = await getChat(url.searchParams.get('username') ?? '')
      if (!data) {
        send(res, 404, { error: 'No public channel or group was found for that username.' })
        return
      }
      send(res, 200, data)
      return
    }

    send(res, 404, { error: 'Not found' })
  } catch {
    send(res, 500, { error: 'The search service failed.' })
  }
}

export function channelEnginePlugin(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    void handle(req, res, next)
  }

  return {
    name: 'channel-engine',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
