import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Agent, ProxyAgent, fetch as undiciFetch, type Dispatcher } from 'undici'

const directAgent = new Agent({ connections: 8 })
const proxyAgents = new Map<string, ProxyAgent>()

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

export class HttpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

function dispatcherFor(torProxy: string | null): Dispatcher {
  if (!torProxy) return directAgent
  let agent = proxyAgents.get(torProxy)
  if (!agent) {
    agent = new ProxyAgent(torProxy)
    proxyAgents.set(torProxy, agent)
  }
  return agent
}

function isBlockedIp(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower.includes(':')) {
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true
    if (lower.startsWith('::ffff:')) return isBlockedIp(lower.slice(7))
    return false
  }
  const parts = lower.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true
  const a = parts[0] ?? 0
  const b = parts[1] ?? 0
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a >= 224) return true
  return false
}

export async function assertPublicHttpUrl(raw: string, allowOnion: boolean): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new HttpError('URL inválida')
  }
  if (url.username || url.password) throw new HttpError('URL com credencial recusada')
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new HttpError('Só http(s)')
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!host) throw new HttpError('Host ausente')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new HttpError('Host interno recusado')
  }
  if (/^\d+$/.test(host)) throw new HttpError('Host numérico recusado')
  if (host.endsWith('.onion')) {
    if (!allowOnion) throw new HttpError('Endereço .onion só abre com o Tor ligado')
    return url
  }
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((row) => row.address)
  if (ips.length === 0 || ips.some((ip) => isBlockedIp(ip))) throw new HttpError('Endereço interno recusado')
  return url
}

export type HeaderBag = { get(name: string): string | null }

async function fetchChecked(
  raw: string,
  init: { torProxy: string | null; timeoutMs: number; method?: 'GET' | 'HEAD'; accept?: string },
): Promise<{ status: number; headers: HeaderBag; body: ReadableStream<Uint8Array> | null; finalUrl: string }> {
  let current = raw
  const allowOnion = Boolean(init.torProxy)
  for (let hop = 0; hop < 4; hop += 1) {
    const url = await assertPublicHttpUrl(current, allowOnion)
    const response = await undiciFetch(url, {
      method: init.method ?? 'GET',
      redirect: 'manual',
      dispatcher: dispatcherFor(allowOnion && url.hostname.endsWith('.onion') ? init.torProxy : null),
      headersTimeout: init.timeoutMs,
      bodyTimeout: init.timeoutMs,
      headers: {
        'user-agent': BROWSER_UA,
        accept: init.accept ?? '*/*',
        'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    } as NonNullable<Parameters<typeof undiciFetch>[1]> & { headersTimeout: number; bodyTimeout: number })
    const location = response.headers.get('location')
    if (location && [301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel()
      current = new URL(location, url).toString()
      continue
    }
    return {
      status: response.status,
      headers: response.headers,
      body: response.body as ReadableStream<Uint8Array> | null,
      finalUrl: url.toString(),
    }
  }
  throw new HttpError('Redirecionamento demais')
}

export async function requestText(
  raw: string,
  init: { torProxy: string | null; timeoutMs: number },
): Promise<{ status: number; text: string; finalUrl: string }> {
  const response = await fetchChecked(raw, {
    ...init,
    accept: 'text/html,application/json,application/xhtml+xml;q=0.9,*/*;q=0.8',
  })
  const text = response.body ? await readLimitedText(response.body, 1_600_000) : ''
  return { status: response.status, text, finalUrl: response.finalUrl }
}

async function readLimitedText(body: ReadableStream<Uint8Array>, max: number): Promise<string> {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const step = await reader.read()
    if (step.done) break
    total += step.value.byteLength
    if (total > max) {
      await reader.cancel()
      break
    }
    chunks.push(step.value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))))
}

export async function requestMedia(
  raw: string,
  init: { torProxy: string | null; timeoutMs: number },
): Promise<{ status: number; headers: HeaderBag; body: ReadableStream<Uint8Array> | null; finalUrl: string }> {
  return fetchChecked(raw, { ...init, accept: 'image/*,video/*,*/*;q=0.8' })
}
