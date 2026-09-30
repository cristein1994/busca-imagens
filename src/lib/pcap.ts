import type { Packet, Protocol, ProtocolField } from '../types/packet'

function readU16BE(buf: Uint8Array, offset: number): number {
  return (buf[offset]! << 8) | buf[offset + 1]!
}

function readU16LE(buf: Uint8Array, offset: number): number {
  return buf[offset]! | (buf[offset + 1]! << 8)
}

function readU32BE(buf: Uint8Array, offset: number): number {
  return (
    ((buf[offset]! << 24) |
      (buf[offset + 1]! << 16) |
      (buf[offset + 2]! << 8) |
      buf[offset + 3]!) >>>
    0
  )
}

function readU32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset]! |
      (buf[offset + 1]! << 8) |
      (buf[offset + 2]! << 16) |
      (buf[offset + 3]! << 24)) >>>
    0
  )
}

function macToString(buf: Uint8Array, offset: number): string {
  return Array.from(buf.slice(offset, offset + 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':')
}

function ipv4ToString(buf: Uint8Array, offset: number): string {
  return `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`
}

function bytesToHex(buf: Uint8Array, start = 0, end = buf.length): string {
  return Array.from(buf.slice(start, end))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}

interface DecodeResult {
  source: string
  destination: string
  protocol: Protocol
  info: string
  layers: ProtocolField[]
}

function decodeTcpFlags(flags: number): string {
  const names: string[] = []
  if (flags & 0x01) names.push('FIN')
  if (flags & 0x02) names.push('SYN')
  if (flags & 0x04) names.push('RST')
  if (flags & 0x08) names.push('PSH')
  if (flags & 0x10) names.push('ACK')
  if (flags & 0x20) names.push('URG')
  return names.join(',') || 'NONE'
}

function decodeUdpPayload(
  data: Uint8Array,
  srcPort: number,
  dstPort: number,
): { protocol: Protocol; info: string; extra: ProtocolField[] } {
  const ports = [srcPort, dstPort]
  if (ports.includes(53)) {
    const qr = data.length > 2 ? (data[2]! >> 7) & 1 : 0
    return {
      protocol: 'DNS',
      info: qr ? 'Standard query response' : 'Standard query',
      extra: [
        {
          label: 'Domain Name System',
          value: qr ? 'response' : 'query',
          children: [
            { label: 'Transaction ID', value: data.length >= 2 ? `0x${readU16BE(data, 0).toString(16)}` : 'n/a' },
            { label: 'Flags', value: data.length >= 4 ? `0x${readU16BE(data, 2).toString(16)}` : 'n/a' },
          ],
        },
      ],
    }
  }
  if (ports.includes(67) || ports.includes(68)) {
    return {
      protocol: 'DHCP',
      info: 'DHCP message',
      extra: [{ label: 'Dynamic Host Configuration Protocol', value: `${data.length} bytes` }],
    }
  }
  if (ports.includes(123)) {
    return {
      protocol: 'NTP',
      info: 'Network Time Protocol',
      extra: [{ label: 'Network Time Protocol', value: `${data.length} bytes` }],
    }
  }
  if (ports.includes(5353)) {
    return {
      protocol: 'MDNS',
      info: 'Multicast DNS',
      extra: [{ label: 'Multicast Domain Name System', value: `${data.length} bytes` }],
    }
  }
  if (ports.includes(1900)) {
    return {
      protocol: 'SSDP',
      info: 'SSDP discover',
      extra: [{ label: 'Simple Service Discovery Protocol', value: `${data.length} bytes` }],
    }
  }
  if (ports.includes(443) || ports.includes(80)) {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, 32))
    if (/^(GET|POST|PUT|HEAD|HTTP\/)/i.test(text)) {
      return {
        protocol: 'HTTP',
        info: text.split('\r\n')[0] || 'HTTP',
        extra: [{ label: 'Hypertext Transfer Protocol', value: text.split('\r\n')[0] || 'HTTP' }],
      }
    }
  }
  return {
    protocol: 'UDP',
    info: `${srcPort} → ${dstPort} Len=${data.length}`,
    extra: [],
  }
}

function decodeIpv4(frame: Uint8Array, offset: number): DecodeResult {
  const ihl = (frame[offset]! & 0x0f) * 4
  const totalLength = readU16BE(frame, offset + 2)
  const protocol = frame[offset + 9]!
  const src = ipv4ToString(frame, offset + 12)
  const dst = ipv4ToString(frame, offset + 16)
  const ipLayer: ProtocolField = {
    label: 'Internet Protocol Version 4',
    value: `Src: ${src}, Dst: ${dst}`,
    children: [
      { label: 'Version', value: String((frame[offset]! >> 4) & 0x0f) },
      { label: 'Header Length', value: `${ihl} bytes` },
      { label: 'Total Length', value: String(totalLength) },
      { label: 'Identification', value: `0x${readU16BE(frame, offset + 4).toString(16)}` },
      { label: 'TTL', value: String(frame[offset + 8]) },
      { label: 'Protocol', value: String(protocol) },
      { label: 'Source Address', value: src },
      { label: 'Destination Address', value: dst },
    ],
  }

  const payloadOffset = offset + ihl
  const layers: ProtocolField[] = [ipLayer]

  if (protocol === 1) {
    const type = frame[payloadOffset] ?? 0
    const code = frame[payloadOffset + 1] ?? 0
    const typeName = type === 8 ? 'Echo (ping) request' : type === 0 ? 'Echo (ping) reply' : `Type ${type}`
    layers.push({
      label: 'Internet Control Message Protocol',
      value: typeName,
      children: [
        { label: 'Type', value: `${type} (${typeName})` },
        { label: 'Code', value: String(code) },
        {
          label: 'Checksum',
          value: frame.length > payloadOffset + 3 ? `0x${readU16BE(frame, payloadOffset + 2).toString(16)}` : 'n/a',
        },
      ],
    })
    return { source: src, destination: dst, protocol: 'ICMP', info: typeName, layers }
  }

  if (protocol === 6) {
    const srcPort = readU16BE(frame, payloadOffset)
    const dstPort = readU16BE(frame, payloadOffset + 2)
    const seq = readU32BE(frame, payloadOffset + 4)
    const ack = readU32BE(frame, payloadOffset + 8)
    const dataOffset = ((frame[payloadOffset + 12]! >> 4) & 0x0f) * 4
    const flags = frame[payloadOffset + 13]!
    const flagStr = decodeTcpFlags(flags)
    const tcpPayload = frame.slice(payloadOffset + dataOffset)
    layers.push({
      label: 'Transmission Control Protocol',
      value: `${srcPort} → ${dstPort} [${flagStr}]`,
      children: [
        { label: 'Source Port', value: String(srcPort) },
        { label: 'Destination Port', value: String(dstPort) },
        { label: 'Sequence Number', value: String(seq) },
        { label: 'Acknowledgment Number', value: String(ack) },
        { label: 'Flags', value: `0x${flags.toString(16)} (${flagStr})` },
        { label: 'Window', value: String(readU16BE(frame, payloadOffset + 14)) },
      ],
    })

    let protocolName: Protocol = 'TCP'
    let info = `${srcPort} → ${dstPort} [${flagStr}] Seq=${seq} Ack=${ack} Len=${tcpPayload.length}`

    if (tcpPayload.length > 0) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(tcpPayload.slice(0, 64))
      if (/^(GET|POST|PUT|HEAD|HTTP\/)/i.test(text)) {
        protocolName = 'HTTP'
        info = text.split('\r\n')[0] || info
        layers.push({ label: 'Hypertext Transfer Protocol', value: info })
      } else if (tcpPayload[0] === 0x16 || tcpPayload[0] === 0x17 || tcpPayload[0] === 0x15) {
        protocolName = dstPort === 443 || srcPort === 443 ? 'TLS' : 'TCP'
        if (protocolName === 'TLS') {
          const contentType =
            tcpPayload[0] === 0x16 ? 'Handshake' : tcpPayload[0] === 0x17 ? 'Application Data' : 'Alert'
          info = `Application Data Protocol: tls, Content Type: ${contentType}`
          layers.push({
            label: 'Transport Layer Security',
            value: contentType,
            children: [
              { label: 'Content Type', value: contentType },
              {
                label: 'Version',
                value:
                  tcpPayload.length > 2
                    ? `0x${readU16BE(tcpPayload, 1).toString(16)}`
                    : 'n/a',
              },
            ],
          })
        }
      } else if (dstPort === 443 || srcPort === 443) {
        protocolName = 'HTTPS'
        info = `Encrypted Application Data`
      }
    }

    return { source: src, destination: dst, protocol: protocolName, info, layers }
  }

  if (protocol === 17) {
    const srcPort = readU16BE(frame, payloadOffset)
    const dstPort = readU16BE(frame, payloadOffset + 2)
    const length = readU16BE(frame, payloadOffset + 4)
    const udpPayload = frame.slice(payloadOffset + 8)
    layers.push({
      label: 'User Datagram Protocol',
      value: `${srcPort} → ${dstPort}`,
      children: [
        { label: 'Source Port', value: String(srcPort) },
        { label: 'Destination Port', value: String(dstPort) },
        { label: 'Length', value: String(length) },
      ],
    })
    const decoded = decodeUdpPayload(udpPayload, srcPort, dstPort)
    layers.push(...decoded.extra)
    return {
      source: src,
      destination: dst,
      protocol: decoded.protocol,
      info: decoded.info,
      layers,
    }
  }

  return {
    source: src,
    destination: dst,
    protocol: 'Unknown',
    info: `IP protocol ${protocol}`,
    layers,
  }
}

function decodeEthernet(frame: Uint8Array): DecodeResult {
  const dstMac = macToString(frame, 0)
  const srcMac = macToString(frame, 6)
  const etherType = readU16BE(frame, 12)
  const ethLayer: ProtocolField = {
    label: 'Ethernet II',
    value: `Src: ${srcMac}, Dst: ${dstMac}`,
    children: [
      { label: 'Destination', value: dstMac },
      { label: 'Source', value: srcMac },
      { label: 'Type', value: `0x${etherType.toString(16).padStart(4, '0')}` },
    ],
  }

  if (etherType === 0x0800) {
    const ip = decodeIpv4(frame, 14)
    return { ...ip, layers: [ethLayer, ...ip.layers] }
  }

  if (etherType === 0x0806) {
    const op = readU16BE(frame, 20)
    const senderIp = ipv4ToString(frame, 28)
    const targetIp = ipv4ToString(frame, 38)
    const info = op === 1 ? `Who has ${targetIp}? Tell ${senderIp}` : `${senderIp} is at ${macToString(frame, 22)}`
    return {
      source: senderIp,
      destination: op === 1 ? 'Broadcast' : targetIp,
      protocol: 'ARP',
      info,
      layers: [
        ethLayer,
        {
          label: 'Address Resolution Protocol',
          value: info,
          children: [
            { label: 'Opcode', value: op === 1 ? '1 (request)' : '2 (reply)' },
            { label: 'Sender MAC', value: macToString(frame, 22) },
            { label: 'Sender IP', value: senderIp },
            { label: 'Target MAC', value: macToString(frame, 32) },
            { label: 'Target IP', value: targetIp },
          ],
        },
      ],
    }
  }

  return {
    source: srcMac,
    destination: dstMac,
    protocol: 'Unknown',
    info: `EtherType 0x${etherType.toString(16)}`,
    layers: [ethLayer],
  }
}

function decodeRadiotap80211(frame: Uint8Array): DecodeResult {
  if (frame.length < 8) {
    return {
      source: '?',
      destination: '?',
      protocol: '802.11',
      info: 'Truncated radiotap',
      layers: [],
    }
  }
  const headerLen = readU16LE(frame, 2)
  const wifiOffset = headerLen
  if (frame.length < wifiOffset + 24) {
    return {
      source: '?',
      destination: '?',
      protocol: '802.11',
      info: 'Truncated 802.11',
      layers: [{ label: 'Radiotap Header', value: `${headerLen} bytes` }],
    }
  }

  const frameControl = frame[wifiOffset]!
  const type = (frameControl >> 2) & 0x03
  const subtype = (frameControl >> 4) & 0x0f
  const addr1 = macToString(frame, wifiOffset + 4)
  const addr2 = macToString(frame, wifiOffset + 10)
  const addr3 = macToString(frame, wifiOffset + 16)

  const typeNames = ['Management', 'Control', 'Data', 'Extension']
  const mgmtSubtypes = [
    'Association Request',
    'Association Response',
    'Reassociation Request',
    'Reassociation Response',
    'Probe Request',
    'Probe Response',
    'Timing',
    'Reserved',
    'Beacon',
    'ATIM',
    'Disassociation',
    'Authentication',
    'Deauthentication',
    'Action',
    'Action No Ack',
    'Reserved',
  ]
  const ctrlSubtypes: Record<number, string> = {
    8: 'Block Ack Request',
    9: 'Block Ack',
    10: 'PS-Poll',
    11: 'RTS',
    12: 'CTS',
    13: 'ACK',
    14: 'CF-End',
    15: 'CF-End + CF-Ack',
  }
  const dataSubtypes = ['Data', 'Data+CF-Ack', 'Data+CF-Poll', 'Data+CF-Ack+CF-Poll', 'Null', 'CF-Ack', 'CF-Poll', 'CF-Ack+CF-Poll', 'QoS Data']

  let subtypeName = `Subtype ${subtype}`
  if (type === 0) subtypeName = mgmtSubtypes[subtype] || subtypeName
  if (type === 1) subtypeName = ctrlSubtypes[subtype] || subtypeName
  if (type === 2) subtypeName = dataSubtypes[subtype] || subtypeName

  const layers: ProtocolField[] = [
    {
      label: 'Radiotap Header',
      value: `length ${headerLen}`,
      children: [
        { label: 'Header length', value: String(headerLen) },
        { label: 'Present flags', value: bytesToHex(frame, 4, Math.min(8, headerLen)) },
      ],
    },
    {
      label: 'IEEE 802.11',
      value: `${typeNames[type]} frame, ${subtypeName}`,
      children: [
        { label: 'Type/Subtype', value: `${typeNames[type]}/${subtypeName}` },
        { label: 'Receiver address', value: addr1 },
        { label: 'Transmitter address', value: addr2 },
        { label: 'BSS Id', value: addr3 },
      ],
    },
  ]

  // Data frames may encapsulate LLC/SNAP + IP
  if (type === 2 && (subtype === 0 || subtype === 8)) {
    const qosOffset = subtype >= 8 ? 2 : 0
    const llcOffset = wifiOffset + 24 + qosOffset
    if (frame.length > llcOffset + 8 && frame[llcOffset] === 0xaa && frame[llcOffset + 1] === 0xaa) {
      const ethertype = readU16BE(frame, llcOffset + 6)
      if (ethertype === 0x0800) {
        const ip = decodeIpv4(frame, llcOffset + 8)
        return {
          ...ip,
          layers: [...layers, { label: 'Logical-Link Control', value: 'SNAP' }, ...ip.layers],
        }
      }
    }
  }

  return {
    source: addr2,
    destination: addr1,
    protocol: '802.11',
    info: `${subtypeName}, SN=0, FN=0`,
    layers,
  }
}

export function decodeFrame(raw: Uint8Array, linkType: number): DecodeResult {
  if (linkType === 1 || linkType === 0) {
    // DLT_EN10MB or null/loopback treated as ethernet-ish
    if (linkType === 0 && raw.length > 4) {
      return decodeEthernet(raw.slice(4))
    }
    return decodeEthernet(raw)
  }
  if (linkType === 127 || linkType === 105) {
    // radiotap or raw 802.11
    if (linkType === 105) {
      // Pretend radiotap length 0
      const padded = new Uint8Array(raw.length + 8)
      padded[2] = 8
      padded.set(raw, 8)
      return decodeRadiotap80211(padded)
    }
    return decodeRadiotap80211(raw)
  }
  // Fallback: try ethernet
  if (raw.length >= 14) return decodeEthernet(raw)
  return {
    source: '?',
    destination: '?',
    protocol: 'Unknown',
    info: `Unsupported link type ${linkType}`,
    layers: [],
  }
}

export interface ParsedCapture {
  linkType: number
  packets: Omit<Packet, 'no' | 'relativeTime'>[]
}

export function parsePcap(buffer: ArrayBuffer): ParsedCapture {
  const data = new Uint8Array(buffer)
  if (data.length < 24) throw new Error('Arquivo PCAP muito curto')

  const magic = readU32LE(data, 0)
  let littleEndian = true
  let nanos = false

  if (magic === 0xa1b2c3d4) {
    littleEndian = true
  } else if (magic === 0xd4c3b2a1) {
    littleEndian = false
  } else if (magic === 0xa1b23c4d) {
    littleEndian = true
    nanos = true
  } else if (magic === 0x4d3cb2a1) {
    littleEndian = false
    nanos = true
  } else if (magic === 0x0a0d0d0a) {
    throw new Error('PCAPNG detectado — exporte como PCAP clássico (Libpcap) no Wireshark')
  } else {
    throw new Error(`Magic PCAP inválido: 0x${magic.toString(16)}`)
  }

  const read32 = littleEndian ? readU32LE : readU32BE
  const linkType = read32(data, 20)

  const packets: ParsedCapture['packets'] = []
  let offset = 24

  while (offset + 16 <= data.length) {
    const tsSec = read32(data, offset)
    const tsUsec = read32(data, offset + 4)
    const inclLen = read32(data, offset + 8)
    const origLen = read32(data, offset + 12)
    offset += 16
    if (offset + inclLen > data.length) break

    const raw = data.slice(offset, offset + inclLen)
    offset += inclLen

    const timestamp = nanos ? tsSec * 1000 + tsUsec / 1e6 : tsSec * 1000 + tsUsec / 1000
    const decoded = decodeFrame(raw, linkType)

    packets.push({
      timestamp,
      source: decoded.source,
      destination: decoded.destination,
      protocol: decoded.protocol,
      length: origLen || inclLen,
      info: decoded.info,
      layers: decoded.layers,
      raw,
    })
  }

  return { linkType, packets }
}

export function toPackets(parsed: ParsedCapture): Packet[] {
  if (parsed.packets.length === 0) return []
  const base = parsed.packets[0]!.timestamp
  return parsed.packets.map((p, i) => ({
    ...p,
    no: i + 1,
    relativeTime: (p.timestamp - base) / 1000,
  }))
}
