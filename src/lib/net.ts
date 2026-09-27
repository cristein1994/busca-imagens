import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

export const UA = 'OrbeOSINT/1.0 (pesquisa em fontes publicas)'

const blocked = new BlockList()
const v4Ranges: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]
for (const [base, prefix] of v4Ranges) blocked.addSubnet(base, prefix, 'ipv4')

blocked.addSubnet('fc00::', 7, 'ipv6')
blocked.addSubnet('fe80::', 10, 'ipv6')
blocked.addSubnet('ff00::', 8, 'ipv6')
blocked.addSubnet('2001:db8::', 32, 'ipv6')
blocked.addAddress('::1', 'ipv6')
blocked.addAddress('::', 'ipv6')

const blockedNames = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.internal',
])

function mappedV4(ip: string): string | null {
  const lower = ip.toLowerCase()
  const dotted = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (dotted) return dotted[1]
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (!hex) return null
  const hi = Number.parseInt(hex[1], 16)
  const lo = Number.parseInt(hex[2], 16)
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`
}

export function isNonPublicIp(ip: string): boolean {
  const mapped = mappedV4(ip)
  if (mapped) return isNonPublicIp(mapped)
  const kind = isIP(ip)
  if (kind === 0) return true
  return blocked.check(ip, kind === 4 ? 'ipv4' : 'ipv6')
}

export function describeIp(ip: string): string | null {
  const value = mappedV4(ip) ?? ip
  const lower = value.toLowerCase()
  if (lower === '::1' || lower.startsWith('127.')) return 'Loopback'
  if (
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)
  ) {
    return 'Rede privada (RFC 1918)'
  }
  if (lower.startsWith('169.254.') || lower.startsWith('fe80:')) return 'Link-local'
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(lower)) return 'CGNAT (RFC 6598)'
  if (isNonPublicIp(value)) return 'Endereço reservado ou não roteável'
  return null
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('tempo esgotado')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function friendlyError(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') return 'tempo esgotado'
  const message = error instanceof Error ? error.message : 'falha desconhecida'
  if (/tempo esgotado|abort/i.test(message)) return 'tempo esgotado'
  if (/ENOTFOUND|EAI_AGAIN|ENODATA/i.test(message)) return 'domínio não resolvido'
  return message
}

export async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/\.$/, '').replace(/^\[|\]$/g, '').toLowerCase()
  if (!host || blockedNames.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Host bloqueado.')
  }
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    throw new Error('Host numérico bloqueado.')
  }
  if (isIP(host)) {
    if (isNonPublicIp(host)) throw new Error('Endereço privado ou reservado bloqueado.')
    return
  }
  const records = await withTimeout(lookup(host, { all: true, verbatim: true }), 5000)
  if (records.length === 0) throw new Error('domínio não resolvido')
  if (records.some((record) => isNonPublicIp(record.address))) {
    throw new Error('O host resolve para uma rede privada.')
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  let out = ''
  try {
    while (out.length < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      out += decoder.decode(value, { stream: true })
    }
  } finally {
    reader.cancel().catch(() => undefined)
  }
  return out.slice(0, maxBytes)
}

export async function requestPublic(
  input: string,
  options?: { ms?: number; headers?: HeadersInit; maxBytes?: number; accept?: string },
): Promise<{ status: number; text: string; contentType: string; finalUrl: string }> {
  let current = new URL(input)
  if (current.protocol !== 'http:' && current.protocol !== 'https:') {
    throw new Error('Apenas http e https.')
  }

  const ms = options?.ms ?? 8000
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    for (let hop = 0; hop < 4; hop += 1) {
      await assertPublicHost(current.hostname)
      const response = await fetch(current, {
        redirect: 'manual',
        signal: ctrl.signal,
        cache: 'no-store',
        headers: {
          'User-Agent': UA,
          Accept: options?.accept ?? 'application/json, text/plain, */*',
          ...options?.headers,
        },
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        await response.body?.cancel().catch(() => undefined)
        if (!location) {
          return { status: response.status, text: '', contentType: '', finalUrl: current.toString() }
        }
        const next = new URL(location, current)
        if (next.protocol !== 'http:' && next.protocol !== 'https:') {
          throw new Error('Redirecionamento para esquema não permitido.')
        }
        current = next
        continue
      }
      const text = await readLimited(response, options?.maxBytes ?? 500_000)
      return {
        status: response.status,
        text,
        contentType: (response.headers.get('content-type') ?? '').split(';')[0].trim(),
        finalUrl: current.toString(),
      }
    }
    throw new Error('Demasiados redirecionamentos.')
  } finally {
    clearTimeout(timer)
  }
}
