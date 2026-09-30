import type { Packet } from '../types/packet'

function contains(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase())
}

function matchCompare(left: string, op: string, right: string): boolean {
  const l = left.toLowerCase()
  const r = right.toLowerCase()
  if (op === '==' || op === 'eq') return l === r
  if (op === '!=' || op === 'ne') return l !== r
  return false
}

/** Wireshark-like display filter (subset). */
export function matchDisplayFilter(packet: Packet, filter: string): boolean {
  const trimmed = filter.trim()
  if (!trimmed) return true

  if (/\s+or\s+/i.test(trimmed) && !/\s+and\s+/i.test(trimmed)) {
    return trimmed.split(/\s+or\s+/i).some((part) => matchDisplayFilter(packet, part))
  }
  if (/\s+and\s+/i.test(trimmed)) {
    return trimmed.split(/\s+and\s+/i).every((part) => matchDisplayFilter(packet, part))
  }
  // Support || and &&
  if (trimmed.includes('||') && !trimmed.includes('&&')) {
    return trimmed.split('||').some((part) => matchDisplayFilter(packet, part))
  }
  if (trimmed.includes('&&')) {
    return trimmed.split('&&').every((part) => matchDisplayFilter(packet, part))
  }

  const expr = trimmed.toLowerCase()
  const negated = expr.startsWith('!')
  const core = negated ? expr.slice(1).trim() : expr

  const protoAliases: Record<string, string[]> = {
    tcp: ['tcp'],
    udp: ['udp'],
    http: ['http'],
    https: ['https', 'tls'],
    tls: ['tls', 'https'],
    dns: ['dns'],
    arp: ['arp'],
    icmp: ['icmp'],
    dhcp: ['dhcp'],
    mdns: ['mdns'],
    ssdp: ['ssdp'],
    ntp: ['ntp'],
    quic: ['quic'],
    wlan: ['802.11'],
    wifi: ['802.11'],
    '802.11': ['802.11'],
  }

  if (protoAliases[core]) {
    const hit = protoAliases[core]!.includes(packet.protocol.toLowerCase())
    return negated ? !hit : hit
  }

  let m = core.match(/^ip\.addr\s*(==|eq|!=|ne)\s*(.+)$/i)
  if (m) {
    const val = m[2]!.trim().replace(/["']/g, '')
    const op = m[1]!
    const hit =
      packet.source.toLowerCase() === val.toLowerCase() ||
      packet.destination.toLowerCase() === val.toLowerCase()
    if (op === '!=' || op === 'ne') return !hit
    return hit
  }

  m = core.match(/^ip\.src\s*(==|eq|!=|ne)\s*(.+)$/i)
  if (m) {
    return matchCompare(packet.source, m[1]!, m[2]!.trim().replace(/["']/g, ''))
  }

  m = core.match(/^ip\.dst\s*(==|eq|!=|ne)\s*(.+)$/i)
  if (m) {
    return matchCompare(packet.destination, m[1]!, m[2]!.trim().replace(/["']/g, ''))
  }

  m = core.match(/^(?:eth|wlan)\.addr\s*(==|eq|!=|ne)\s*(.+)$/i)
  if (m) {
    const val = m[2]!.trim().replace(/["']/g, '')
    const hit =
      packet.source.toLowerCase() === val.toLowerCase() ||
      packet.destination.toLowerCase() === val.toLowerCase()
    return m[1] === '!=' || m[1] === 'ne' ? !hit : hit
  }

  m = core.match(/^frame\.len\s*(==|eq|!=|ne|>|<|>=|<=)\s*(\d+)$/i)
  if (m) {
    const n = Number(m[2])
    const op = m[1]!
    if (op === '>') return packet.length > n
    if (op === '<') return packet.length < n
    if (op === '>=') return packet.length >= n
    if (op === '<=') return packet.length <= n
    if (op === '!=' || op === 'ne') return packet.length !== n
    return packet.length === n
  }

  m = core.match(/^frame\.number\s*(==|eq)\s*(\d+)$/i)
  if (m) return packet.no === Number(m[2])

  m = core.match(/^(?:http|frame|tcp)\s+contains\s+(.+)$/i)
  if (m) {
    const needle = m[1]!.trim().replace(/^["']|["']$/g, '')
    const ascii = new TextDecoder('utf-8', { fatal: false }).decode(packet.raw)
    return contains(ascii, needle) || contains(packet.info, needle)
  }

  return (
    contains(packet.info, trimmed) ||
    contains(packet.source, trimmed) ||
    contains(packet.destination, trimmed) ||
    contains(packet.protocol, trimmed)
  )
}

export function isFilterSyntaxOk(filter: string): boolean {
  const t = filter.trim()
  if (!t) return true
  // Very light validation: unbalanced quotes
  const quotes = (t.match(/"/g) || []).length
  if (quotes % 2 !== 0) return false
  return true
}

export const FILTER_EXAMPLES = [
  'tcp',
  'udp',
  'http',
  'dns',
  'arp',
  'icmp',
  'wlan',
  'tls',
  'ip.addr == 192.168.1.10',
  'ip.src == 8.8.8.8',
  'tcp && http',
  'dns || mdns',
  'frame.len > 100',
  'http contains Host',
]
