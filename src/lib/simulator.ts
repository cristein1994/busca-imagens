import type { Packet, Protocol } from '../types/packet'
import { decodeFrame } from './pcap'

function randByte(): number {
  return Math.floor(Math.random() * 256)
}

function randMac(prefix?: number[]): Uint8Array {
  const mac = new Uint8Array(6)
  if (prefix) {
    for (let i = 0; i < prefix.length && i < 6; i++) mac[i] = prefix[i]!
    for (let i = prefix.length; i < 6; i++) mac[i] = randByte()
  } else {
    mac[0] = (randByte() & 0xfe) | 0x02
    for (let i = 1; i < 6; i++) mac[i] = randByte()
  }
  return mac
}

function ipv4(a: number, b: number, c: number, d: number): Uint8Array {
  return new Uint8Array([a, b, c, d])
}

function checksum(buf: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < buf.length; i += 2) {
    const word = (buf[i]! << 8) | (buf[i + 1] ?? 0)
    sum += word
  }
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16)
  return ~sum & 0xffff
}

function buildEthernet(dst: Uint8Array, src: Uint8Array, etherType: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(14 + payload.length)
  frame.set(dst, 0)
  frame.set(src, 6)
  frame[12] = (etherType >> 8) & 0xff
  frame[13] = etherType & 0xff
  frame.set(payload, 14)
  return frame
}

function buildIpv4(
  src: Uint8Array,
  dst: Uint8Array,
  protocol: number,
  payload: Uint8Array,
  ttl = 64,
): Uint8Array {
  const header = new Uint8Array(20)
  header[0] = 0x45
  const total = 20 + payload.length
  header[2] = (total >> 8) & 0xff
  header[3] = total & 0xff
  const id = Math.floor(Math.random() * 0xffff)
  header[4] = (id >> 8) & 0xff
  header[5] = id & 0xff
  header[8] = ttl
  header[9] = protocol
  header.set(src, 12)
  header.set(dst, 16)
  const csum = checksum(header)
  header[10] = (csum >> 8) & 0xff
  header[11] = csum & 0xff
  const out = new Uint8Array(20 + payload.length)
  out.set(header, 0)
  out.set(payload, 20)
  return out
}

function buildUdp(srcPort: number, dstPort: number, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.length)
  out[0] = (srcPort >> 8) & 0xff
  out[1] = srcPort & 0xff
  out[2] = (dstPort >> 8) & 0xff
  out[3] = dstPort & 0xff
  const len = 8 + payload.length
  out[4] = (len >> 8) & 0xff
  out[5] = len & 0xff
  out.set(payload, 8)
  return out
}

function buildTcp(
  srcPort: number,
  dstPort: number,
  seq: number,
  ack: number,
  flags: number,
  payload: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(20 + payload.length)
  out[0] = (srcPort >> 8) & 0xff
  out[1] = srcPort & 0xff
  out[2] = (dstPort >> 8) & 0xff
  out[3] = dstPort & 0xff
  out[4] = (seq >>> 24) & 0xff
  out[5] = (seq >>> 16) & 0xff
  out[6] = (seq >>> 8) & 0xff
  out[7] = seq & 0xff
  out[8] = (ack >>> 24) & 0xff
  out[9] = (ack >>> 16) & 0xff
  out[10] = (ack >>> 8) & 0xff
  out[11] = ack & 0xff
  out[12] = 0x50
  out[13] = flags
  out[14] = 0xff
  out[15] = 0xff
  out.set(payload, 20)
  return out
}

function buildDnsQuery(name: string): Uint8Array {
  const labels = name.split('.')
  const parts: number[] = [0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
  for (const label of labels) {
    parts.push(label.length)
    for (let i = 0; i < label.length; i++) parts.push(label.charCodeAt(i))
  }
  parts.push(0, 0x00, 0x01, 0x00, 0x01)
  return new Uint8Array(parts)
}

function buildHttpGet(host: string, path: string): Uint8Array {
  const req = `GET ${path} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: NexusCapture/1.0\r\nAccept: */*\r\n\r\n`
  return new TextEncoder().encode(req)
}

function buildArpRequest(senderMac: Uint8Array, senderIp: Uint8Array, targetIp: Uint8Array): Uint8Array {
  const payload = new Uint8Array(28)
  payload[0] = 0x00
  payload[1] = 0x01
  payload[2] = 0x08
  payload[3] = 0x00
  payload[4] = 0x06
  payload[5] = 0x04
  payload[6] = 0x00
  payload[7] = 0x01
  payload.set(senderMac, 8)
  payload.set(senderIp, 14)
  payload.set(targetIp, 24)
  return payload
}

function buildIcmpEcho(id: number, seq: number): Uint8Array {
  const out = new Uint8Array(16)
  out[0] = 8
  out[4] = (id >> 8) & 0xff
  out[5] = id & 0xff
  out[6] = (seq >> 8) & 0xff
  out[7] = seq & 0xff
  for (let i = 8; i < 16; i++) out[i] = i
  const csum = checksum(out)
  out[2] = (csum >> 8) & 0xff
  out[3] = csum & 0xff
  return out
}

function buildBeacon80211(bssid: Uint8Array, ssid: string): Uint8Array {
  // Minimal radiotap (8 bytes) + beacon
  const ssidBytes = new TextEncoder().encode(ssid)
  const bodyLen = 12 + 2 + ssidBytes.length + 3
  const frame = new Uint8Array(8 + 24 + bodyLen)
  frame[0] = 0x00
  frame[1] = 0x00
  frame[2] = 0x08
  frame[3] = 0x00
  // Frame control: management beacon
  frame[8] = 0x80
  frame[9] = 0x00
  const broadcast = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
  frame.set(broadcast, 12)
  frame.set(bssid, 18)
  frame.set(bssid, 24)
  // Fixed params + tagged SSID + rates
  let o = 32
  // timestamp 8 bytes already zero
  o += 8
  frame[o] = 0x64
  frame[o + 1] = 0x00 // beacon interval
  o += 2
  frame[o] = 0x01
  frame[o + 1] = 0x04 // capability
  o += 2
  frame[o++] = 0x00
  frame[o++] = ssidBytes.length
  frame.set(ssidBytes, o)
  o += ssidBytes.length
  frame[o++] = 0x01
  frame[o++] = 0x01
  frame[o++] = 0x82
  return frame
}

const HOSTS = [
  { ip: ipv4(192, 168, 1, 10), mac: randMac([0x3c, 0x22, 0xfb]), name: 'laptop' },
  { ip: ipv4(192, 168, 1, 20), mac: randMac([0xa4, 0x83, 0xe7]), name: 'phone' },
  { ip: ipv4(192, 168, 1, 1), mac: randMac([0x00, 0x1a, 0x2b]), name: 'gateway' },
]

const REMOTES = [
  { ip: ipv4(8, 8, 8, 8), host: 'dns.google' },
  { ip: ipv4(1, 1, 1, 1), host: 'one.one.one.one' },
  { ip: ipv4(142, 250, 190, 78), host: 'www.google.com' },
  { ip: ipv4(104, 16, 132, 229), host: 'cloudflare.com' },
  { ip: ipv4(13, 107, 21, 200), host: 'microsoft.com' },
]

const SSIDS = ['Casa-Fibra-5G', 'Vizinho_2.4', 'NexusLab', 'iPhone_Hotspot']

export type SimMode = 'wifi' | 'lan' | 'mixed'

export function generateSimulatedFrame(mode: SimMode = 'mixed'): { raw: Uint8Array; linkType: number } {
  const roll = Math.random()
  const host = HOSTS[Math.floor(Math.random() * HOSTS.length)]!
  const remote = REMOTES[Math.floor(Math.random() * REMOTES.length)]!
  const gw = HOSTS[2]!

  const wantWifi = mode === 'wifi' || (mode === 'mixed' && roll < 0.25)

  if (wantWifi && roll < 0.12) {
    const bssid = randMac([0x00, 0x1a, 0x2b])
    const ssid = SSIDS[Math.floor(Math.random() * SSIDS.length)]!
    return { raw: buildBeacon80211(bssid, ssid), linkType: 127 }
  }

  if (roll < 0.18) {
    const target = ipv4(192, 168, 1, 1 + Math.floor(Math.random() * 50))
    const arp = buildArpRequest(host.mac, host.ip, target)
    const broadcast = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
    return { raw: buildEthernet(broadcast, host.mac, 0x0806, arp), linkType: 1 }
  }

  if (roll < 0.35) {
    const dns = buildDnsQuery(remote.host)
    const udp = buildUdp(53000 + Math.floor(Math.random() * 1000), 53, dns)
    const ip = buildIpv4(host.ip, REMOTES[0]!.ip, 17, udp)
    return { raw: buildEthernet(gw.mac, host.mac, 0x0800, ip), linkType: 1 }
  }

  if (roll < 0.45) {
    const icmp = buildIcmpEcho(Math.floor(Math.random() * 0xffff), Math.floor(Math.random() * 100))
    const ip = buildIpv4(host.ip, remote.ip, 1, icmp)
    return { raw: buildEthernet(gw.mac, host.mac, 0x0800, ip), linkType: 1 }
  }

  if (roll < 0.6) {
    const http = buildHttpGet(remote.host, '/')
    const tcp = buildTcp(49152 + Math.floor(Math.random() * 1000), 80, 1000, 0, 0x18, http)
    const ip = buildIpv4(host.ip, remote.ip, 6, tcp)
    return { raw: buildEthernet(gw.mac, host.mac, 0x0800, ip), linkType: 1 }
  }

  if (roll < 0.75) {
    const tlsPayload = new Uint8Array([0x17, 0x03, 0x03, 0x00, 0x28, ...Array.from({ length: 40 }, () => randByte())])
    const tcp = buildTcp(49152 + Math.floor(Math.random() * 1000), 443, 5000, 8000, 0x18, tlsPayload)
    const ip = buildIpv4(host.ip, remote.ip, 6, tcp)
    return { raw: buildEthernet(gw.mac, host.mac, 0x0800, ip), linkType: 1 }
  }

  if (roll < 0.85) {
    const syn = buildTcp(49152 + Math.floor(Math.random() * 1000), 443, 1, 0, 0x02, new Uint8Array(0))
    const ip = buildIpv4(host.ip, remote.ip, 6, syn)
    return { raw: buildEthernet(gw.mac, host.mac, 0x0800, ip), linkType: 1 }
  }

  // NTP / SSDP / MDNS mix
  const port = [123, 1900, 5353][Math.floor(Math.random() * 3)]!
  const payload = new Uint8Array(32)
  for (let i = 0; i < payload.length; i++) payload[i] = randByte()
  const udp = buildUdp(50000 + Math.floor(Math.random() * 1000), port, payload)
  const dstIp = port === 5353 ? ipv4(224, 0, 0, 251) : remote.ip
  const ip = buildIpv4(host.ip, dstIp, 17, udp)
  return { raw: buildEthernet(gw.mac, host.mac, 0x0800, ip), linkType: 1 }
}

export function frameToPacket(
  raw: Uint8Array,
  linkType: number,
  no: number,
  baseTime: number,
  now = Date.now(),
): Packet {
  const decoded = decodeFrame(raw, linkType)
  return {
    no,
    timestamp: now,
    relativeTime: (now - baseTime) / 1000,
    source: decoded.source,
    destination: decoded.destination,
    protocol: decoded.protocol,
    length: raw.length,
    info: decoded.info,
    layers: decoded.layers,
    raw,
  }
}

export function protocolColor(protocol: Protocol): { bg: string; fg: string } {
  switch (protocol) {
    case 'TCP':
      return { bg: '#e7e6ff', fg: '#1a1a2e' }
    case 'UDP':
      return { bg: '#daeeff', fg: '#1a1a2e' }
    case 'HTTP':
      return { bg: '#e4ffc7', fg: '#1a1a2e' }
    case 'HTTPS':
    case 'TLS':
      return { bg: '#c7ffd8', fg: '#1a1a2e' }
    case 'DNS':
    case 'MDNS':
      return { bg: '#ffe0c2', fg: '#1a1a2e' }
    case 'ARP':
      return { bg: '#faf0d7', fg: '#1a1a2e' }
    case 'ICMP':
      return { bg: '#fce0ff', fg: '#1a1a2e' }
    case 'DHCP':
    case 'SSDP':
      return { bg: '#ffe0d0', fg: '#1a1a2e' }
    case '802.11':
      return { bg: '#d0f0ff', fg: '#1a1a2e' }
    case 'NTP':
      return { bg: '#fff0c0', fg: '#1a1a2e' }
    case 'QUIC':
      return { bg: '#d8ffe8', fg: '#1a1a2e' }
    default:
      return { bg: '#ffffff', fg: '#1a1a2e' }
  }
}
