import net from 'node:net'
import type { TorStatus } from '../shared/contracts.ts'
import { requestText } from './net.ts'

const AHMIA_ONION = 'http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion/'

function tcpOpen(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const finish = (value: boolean) => {
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

function asSocks5(proxy: string): string | null {
  try {
    const url = new URL(proxy)
    if (url.protocol !== 'socks5:' && url.protocol !== 'socks5h:' && url.protocol !== 'socks:') return null
    url.protocol = 'socks5:'
    return url.toString()
  } catch {
    return null
  }
}

function candidates(): string[] {
  const fromEnv = process.env.TOR_SOCKS?.trim()
  const list = [fromEnv, 'socks5://127.0.0.1:9050', 'socks5://127.0.0.1:9150']
    .map((item) => (item ? asSocks5(item) : null))
    .filter((item): item is string => Boolean(item))
  return [...new Set(list)]
}

export async function detectTor(probe: boolean): Promise<TorStatus> {
  for (const proxy of candidates()) {
    let parsed: URL
    try {
      parsed = new URL(proxy)
    } catch {
      continue
    }
    const port = Number(parsed.port || 9050)
    const open = await tcpOpen(parsed.hostname, port, 500)
    if (!open) continue
    if (!probe) {
      return { ok: true, proxy, detail: `SOCKS ativo em ${parsed.hostname}:${port}`, probed: false }
    }
    try {
      const page = await requestText(AHMIA_ONION, { torProxy: proxy, timeoutMs: 20000 })
      if (page.status >= 200 && page.status < 400 && /ahmia/i.test(page.text)) {
        return { ok: true, proxy, detail: `Circuito ok via ${parsed.host}. Ahmia .onion respondeu.`, probed: true }
      }
      return {
        ok: true,
        proxy,
        detail: `SOCKS ativo, mas a prova em .onion voltou HTTP ${page.status}.`,
        probed: true,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha'
      return { ok: true, proxy, detail: `SOCKS ativo, prova .onion falhou: ${message}`, probed: true }
    }
  }
  return {
    ok: false,
    proxy: null,
    detail: 'Tor não encontrado em 127.0.0.1:9050 nem :9150. Defina TOR_SOCKS ou inicie o serviço tor.',
    probed: probe,
  }
}
