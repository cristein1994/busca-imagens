import http from 'node:http'
import https from 'node:https'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { TOR_SOCKS, USER_AGENT } from './constants'

export class FetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FetchError'
  }
}

type TextResponse = {
  status: number
  url: string
  body: string
  contentType: string
}

const BASE_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
}

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < maxBytes) {
    const { done, value } = await reader.read()
    if (done || !value) break
    size += value.byteLength
    chunks.push(value)
    if (size >= maxBytes) {
      await reader.cancel()
      break
    }
  }
  const buffer = new Uint8Array(Math.min(size, maxBytes))
  let offset = 0
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, Math.max(0, maxBytes - offset))
    buffer.set(slice, offset)
    offset += slice.byteLength
    if (offset >= maxBytes) break
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer.subarray(0, offset))
}

export async function fetchText(
  url: string,
  init?: { method?: 'GET' | 'POST'; body?: string; headers?: Record<string, string>; timeoutMs?: number; maxBytes?: number },
): Promise<TextResponse> {
  const timeoutMs = init?.timeoutMs ?? 15000
  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { ...BASE_HEADERS, ...init?.headers },
    body: init?.body,
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  })
  const body = await readLimited(response, init?.maxBytes ?? 1_500_000)
  return {
    status: response.status,
    url: response.url,
    body,
    contentType: response.headers.get('content-type') ?? '',
  }
}

type RawResponse = {
  status: number
  headers: http.IncomingHttpHeaders
  body: Buffer
}

function requestOnce(target: URL, headers: Record<string, string>, timeoutMs: number, maxBytes: number, agent: SocksProxyAgent): Promise<RawResponse> {
  const lib = target.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: 'GET',
        headers,
        agent,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > maxBytes) {
            req.destroy()
            reject(new FetchError('resposta Tor grande demais'))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) })
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new FetchError('timeout no proxy Tor'))
    })
    req.end()
  })
}

function cookieHeader(setCookies: string[]): string {
  return setCookies
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ')
}

export async function fetchTextTor(startUrl: string, timeoutMs = 35000): Promise<TextResponse> {
  const agent = new SocksProxyAgent(TOR_SOCKS)
  let current = new URL(startUrl)
  const jar: string[] = []
  const maxBytes = 2_000_000

  for (let hop = 0; hop < 5; hop += 1) {
    const headers: Record<string, string> = { ...BASE_HEADERS, Host: current.host }
    const cookie = cookieHeader(jar)
    if (cookie) headers.Cookie = cookie
    const response = await requestOnce(current, headers, timeoutMs, maxBytes, agent)
    const fresh = response.headers['set-cookie']
    if (Array.isArray(fresh)) jar.push(...fresh)
    else if (fresh) jar.push(fresh)

    const location = response.headers.location
    if (location && response.status >= 300 && response.status < 400) {
      current = new URL(location, current)
      continue
    }

    const contentType = Array.isArray(response.headers['content-type'])
      ? response.headers['content-type'][0] ?? ''
      : response.headers['content-type'] ?? ''

    return {
      status: response.status,
      url: current.toString(),
      body: response.body.toString('utf8'),
      contentType,
    }
  }

  throw new FetchError('muitos redirecionamentos via Tor')
}
