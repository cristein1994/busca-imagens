import http from 'node:http'
import https from 'node:https'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { getTorConfig } from './config.ts'

export function getTorAgent(env: Record<string, string>) {
  const { host, port } = getTorConfig(env)
  return new SocksProxyAgent(`socks5h://${host}:${port}`)
}

export async function torRequest(
  env: Record<string, string>,
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string
    timeoutMs?: number
  } = {},
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const { method = 'GET', headers = {}, body, timeoutMs = 45000 } = options
  const agent = getTorAgent(env)
  const parsed = new URL(url)
  const lib = parsed.protocol === 'http:' ? http : https

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'http:' ? 80 : 443),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers,
        agent,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          clearTimeout(timer)
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(res.headers)) {
            if (v) flat[k] = Array.isArray(v) ? v.join(', ') : String(v)
          }
          resolve({
            status: res.statusCode || 0,
            headers: flat,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )

    const timer = setTimeout(() => {
      req.destroy(new Error('Tor request timeout'))
    }, timeoutMs)

    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    if (body) req.write(body)
    req.end()
  })
}

export async function checkTor(env: Record<string, string>): Promise<{
  ok: boolean
  isTor: boolean
  ip?: string
  error?: string
  host: string
  port: number
}> {
  const { host, port } = getTorConfig(env)
  try {
    const res = await torRequest(env, 'https://check.torproject.org/api/ip', {
      timeoutMs: 25000,
    })
    const data = JSON.parse(res.body) as { IsTor?: boolean; IP?: string }
    return {
      ok: res.status === 200,
      isTor: Boolean(data.IsTor),
      ip: data.IP,
      host,
      port,
    }
  } catch (e) {
    return {
      ok: false,
      isTor: false,
      error: e instanceof Error ? e.message : String(e),
      host,
      port,
    }
  }
}
