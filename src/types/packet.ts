export type Protocol =
  | '802.11'
  | 'ARP'
  | 'DNS'
  | 'DHCP'
  | 'HTTP'
  | 'HTTPS'
  | 'ICMP'
  | 'IGMP'
  | 'MDNS'
  | 'NTP'
  | 'QUIC'
  | 'SSDP'
  | 'TCP'
  | 'TLS'
  | 'UDP'
  | 'Unknown'

export interface ProtocolField {
  label: string
  value: string
  children?: ProtocolField[]
}

export interface Packet {
  no: number
  timestamp: number
  relativeTime: number
  source: string
  destination: string
  protocol: Protocol
  length: number
  info: string
  layers: ProtocolField[]
  raw: Uint8Array
  linkType: number
}

export interface CaptureInterface {
  id: string
  name: string
  description: string
  type: 'wifi' | 'ethernet' | 'loopback' | 'any'
  mac?: string
  channel?: number
}

export interface CaptureStats {
  total: number
  displayed: number
  dropped: number
  bytes: number
  byProtocol: Record<string, number>
}
