import type { Packet } from '../types/packet'

export interface DecodedMessage {
  kind: string
  summary: string
  body: string
  encoding: 'utf-8' | 'hex' | 'none'
}

function printableAscii(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => (b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13 ? String.fromCharCode(b) : '.')
    .join('')
}

function tryUtf8(data: Uint8Array): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data)
    // Prefer payloads that look like text
    const printable = [...text].filter((c) => {
      const code = c.charCodeAt(0)
      return (code >= 32 && code < 127) || code === 9 || code === 10 || code === 13
    }).length
    if (text.length === 0) return null
    if (printable / text.length < 0.7) return null
    return text
  } catch {
    return null
  }
}

function findHttpPayload(raw: Uint8Array): Uint8Array | null {
  // Scan for HTTP start line inside frame
  const markers = ['GET ', 'POST ', 'PUT ', 'HEAD ', 'HTTP/1.', 'HTTP/2']
  const ascii = new TextDecoder('utf-8', { fatal: false }).decode(raw)
  for (const m of markers) {
    const idx = ascii.indexOf(m)
    if (idx >= 0) return raw.slice(idx)
  }
  return null
}

function decodeDnsName(data: Uint8Array, offset: number): { name: string; next: number } {
  const labels: string[] = []
  let i = offset
  let jumped = false
  let next = offset
  let guard = 0
  while (i < data.length && guard++ < 64) {
    const len = data[i]!
    if (len === 0) {
      if (!jumped) next = i + 1
      break
    }
    if ((len & 0xc0) === 0xc0) {
      if (i + 1 >= data.length) break
      const ptr = ((len & 0x3f) << 8) | data[i + 1]!
      if (!jumped) next = i + 2
      i = ptr
      jumped = true
      continue
    }
    i += 1
    if (i + len > data.length) break
    labels.push(new TextDecoder().decode(data.slice(i, i + len)))
    i += len
    if (!jumped) next = i
  }
  return { name: labels.join('.') || '.', next }
}

function decodeDnsMessage(raw: Uint8Array): DecodedMessage | null {
  // Find UDP payload heuristically: look for DNS header after eth+ip+udp (42) or similar
  // Prefer scanning for ports isn't available; try offsets 42 (eth+ipv4+udp) and walk IP
  let data: Uint8Array | null = null
  if (raw.length > 34 && raw[12] === 0x08 && raw[13] === 0x00) {
    const ihl = (raw[14]! & 0x0f) * 4
    const proto = raw[14 + 9]!
    if (proto === 17) {
      const udpStart = 14 + ihl
      data = raw.slice(udpStart + 8)
    }
  }
  if (!data || data.length < 12) return null

  const id = (data[0]! << 8) | data[1]!
  const flags = (data[2]! << 8) | data[3]!
  const qr = (flags >> 15) & 1
  const qdcount = (data[4]! << 8) | data[5]!
  const names: string[] = []
  let offset = 12
  for (let q = 0; q < qdcount && offset < data.length; q++) {
    const { name, next } = decodeDnsName(data, offset)
    names.push(name)
    offset = next + 4 // type + class
  }

  const kind = qr ? 'DNS Response' : 'DNS Query'
  const summary = names[0] ? `${kind}: ${names[0]}` : kind
  const body = [
    `Transaction ID: 0x${id.toString(16).padStart(4, '0')}`,
    `Type: ${kind}`,
    `Questions: ${qdcount}`,
    names.length ? `Names:\n${names.map((n) => `  - ${n}`).join('\n')}` : 'Names: (none)',
  ].join('\n')

  return { kind: 'DNS', summary, body, encoding: 'utf-8' }
}

export function decodePacketMessage(packet: Packet): DecodedMessage {
  const { protocol, info, raw } = packet

  if (protocol === 'HTTP' || protocol === 'HTTPS') {
    const http = findHttpPayload(raw)
    if (http) {
      const text = tryUtf8(http) || printableAscii(http)
      const first = text.split(/\r?\n/)[0] || info
      return {
        kind: 'HTTP',
        summary: first,
        body: text,
        encoding: 'utf-8',
      }
    }
  }

  if (protocol === 'DNS' || protocol === 'MDNS') {
    const dns = decodeDnsMessage(raw)
    if (dns) return dns
  }

  if (protocol === 'ARP') {
    return {
      kind: 'ARP',
      summary: info,
      body: info,
      encoding: 'utf-8',
    }
  }

  if (protocol === 'ICMP') {
    return {
      kind: 'ICMP',
      summary: info,
      body: info,
      encoding: 'utf-8',
    }
  }

  if (protocol === 'DHCP' || protocol === 'SSDP' || protocol === 'NTP') {
    return {
      kind: protocol,
      summary: info,
      body: info,
      encoding: 'utf-8',
    }
  }

  if (protocol === 'TLS') {
    return {
      kind: 'TLS',
      summary: info,
      body: 'Encrypted TLS application data (conteúdo cifrado).',
      encoding: 'none',
    }
  }

  // Generic: try UTF-8 on whole frame, then ASCII preview of last 256 bytes
  const utf = tryUtf8(raw)
  if (utf && utf.length > 8 && /[A-Za-z]{3,}/.test(utf)) {
    return {
      kind: protocol,
      summary: info,
      body: utf,
      encoding: 'utf-8',
    }
  }

  const tail = raw.slice(Math.max(0, raw.length - 256))
  return {
    kind: protocol,
    summary: info,
    body: printableAscii(tail),
    encoding: 'hex',
  }
}

const LIVE_KINDS = new Set([
  'HTTP',
  'HTTPS',
  'DNS',
  'MDNS',
  'ARP',
  'ICMP',
  'DHCP',
  'SSDP',
  'NTP',
])

/** Protocols worth showing in the continuous live message feed. */
export function isLiveMessagePacket(packet: Packet): boolean {
  return LIVE_KINDS.has(packet.protocol)
}
