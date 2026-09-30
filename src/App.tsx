import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CaptureInterface, CaptureStats, Packet } from './types/packet'
import { parsePcap, toPackets, buildPcap } from './lib/pcap'
import { frameToPacket, generateSimulatedFrame, type SimMode } from './lib/simulator'
import { isFilterSyntaxOk, matchDisplayFilter } from './lib/filter'
import { Toolbar } from './components/Toolbar'
import { FilterBar } from './components/FilterBar'
import { PacketList } from './components/PacketList'
import { PacketDetails } from './components/PacketDetails'
import { HexDump } from './components/HexDump'
import { MessagePane } from './components/MessagePane'
import { StatusBar } from './components/StatusBar'
import styles from './App.module.css'

const INTERFACES: CaptureInterface[] = [
  {
    id: 'wlan0-mon',
    name: 'wlan0 (monitor)',
    description: 'Wi-Fi 802.11 + radiotap (simulado)',
    type: 'wifi',
    channel: 6,
    mac: '02:1a:2b:3c:4d:5e',
  },
  {
    id: 'wlan0',
    name: 'wlan0',
    description: 'Wi-Fi managed mode (simulado)',
    type: 'wifi',
    channel: 36,
    mac: '02:1a:2b:3c:4d:5e',
  },
  {
    id: 'eth0',
    name: 'eth0',
    description: 'Ethernet LAN (simulado)',
    type: 'ethernet',
    mac: '3c:22:fb:10:20:30',
  },
  {
    id: 'any',
    name: 'any',
    description: 'Todas as interfaces (misto)',
    type: 'any',
  },
]

const MAX_PACKETS = 5000

function ifaceMode(id: string): SimMode {
  if (id === 'wlan0-mon') return 'wifi'
  if (id === 'eth0') return 'lan'
  return 'mixed'
}

function buildStats(all: Packet[], displayed: Packet[]): CaptureStats {
  const byProtocol: Record<string, number> = {}
  let bytes = 0
  for (const p of all) {
    byProtocol[p.protocol] = (byProtocol[p.protocol] || 0) + 1
    bytes += p.length
  }
  return {
    total: all.length,
    displayed: displayed.length,
    dropped: 0,
    bytes,
    byProtocol,
  }
}

export default function App() {
  const [packets, setPackets] = useState<Packet[]>([])
  const [selectedNo, setSelectedNo] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [selectedIface, setSelectedIface] = useState(INTERFACES[0]!.id)
  const [packetRate, setPacketRate] = useState(12)
  const [error, setError] = useState<string | null>(null)
  const [sourceLabel, setSourceLabel] = useState('Pronto')

  const [followLatest, setFollowLatest] = useState(true)
  const baseTimeRef = useRef(0)
  const nextNoRef = useRef(1)
  const timerRef = useRef<number | null>(null)
  const packetCountRef = useRef(0)
  const packetsRef = useRef<Packet[]>([])
  const autoStarted = useRef(false)

  useEffect(() => {
    packetCountRef.current = packets.length
    packetsRef.current = packets
  }, [packets])

  const filterValid = isFilterSyntaxOk(filter)

  const displayed = useMemo(() => {
    if (!filter.trim() || !filterValid) return packets
    return packets.filter((p) => matchDisplayFilter(p, filter))
  }, [packets, filter, filterValid])

  const effectiveSelectedNo = useMemo(() => {
    if (capturing && followLatest && !filter.trim() && displayed.length > 0) {
      return displayed[displayed.length - 1]!.no
    }
    if (selectedNo != null && displayed.some((p) => p.no === selectedNo)) return selectedNo
    return displayed[0]?.no ?? null
  }, [capturing, followLatest, filter, displayed, selectedNo])

  const selected = useMemo(
    () => packets.find((p) => p.no === effectiveSelectedNo) ?? null,
    [packets, effectiveSelectedNo],
  )

  const stats = useMemo(() => buildStats(packets, displayed), [packets, displayed])
  const iface = INTERFACES.find((i) => i.id === selectedIface) ?? INTERFACES[0]!

  const stopCapture = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setCapturing(false)
  }, [])

  const startCapture = useCallback(() => {
    setError(null)
    setFollowLatest(true)
    setSourceLabel(`Live · ${iface.name}`)
    setCapturing(true)
    if (packetCountRef.current === 0) {
      baseTimeRef.current = Date.now()
      nextNoRef.current = 1
    } else if (baseTimeRef.current === 0) {
      baseTimeRef.current = packetsRef.current[0]?.timestamp ?? Date.now()
    }

    if (timerRef.current != null) window.clearInterval(timerRef.current)
    const mode = ifaceMode(selectedIface)
    const intervalMs = Math.max(20, Math.floor(1000 / Math.max(1, packetRate)))

    timerRef.current = window.setInterval(() => {
      const burst = packetRate > 40 ? 2 : 1
      setPackets((prev) => {
        const next = [...prev]
        for (let i = 0; i < burst; i++) {
          const { raw, linkType } = generateSimulatedFrame(mode)
          const pkt = frameToPacket(raw, linkType, nextNoRef.current++, baseTimeRef.current)
          next.push(pkt)
        }
        if (next.length > MAX_PACKETS) {
          return next.slice(next.length - MAX_PACKETS)
        }
        return next
      })
    }, intervalMs)
  }, [iface.name, packetRate, selectedIface])

  // Auto-start capture on first load
  useEffect(() => {
    if (autoStarted.current) return
    autoStarted.current = true
    startCapture()
  }, [startCapture])

  useEffect(() => () => stopCapture(), [stopCapture])

  const handleClear = () => {
    stopCapture()
    setPackets([])
    setSelectedNo(null)
    nextNoRef.current = 1
    baseTimeRef.current = Date.now()
    setSourceLabel('Pronto')
    setError(null)
  }

  const handleOpenFile = async (file: File) => {
    stopCapture()
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      const parsed = parsePcap(buf)
      const list = toPackets(parsed)
      setPackets(list)
      nextNoRef.current = list.length + 1
      baseTimeRef.current = list[0]?.timestamp ?? Date.now()
      setSelectedNo(list[0]?.no ?? null)
      setSourceLabel(`Arquivo · ${file.name} · linktype ${parsed.linkType}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ler PCAP')
    }
  }

  const handleExportJson = () => {
    const payload = displayed.map((p) => ({
      no: p.no,
      time: p.relativeTime,
      source: p.source,
      destination: p.destination,
      protocol: p.protocol,
      length: p.length,
      info: p.info,
      linkType: p.linkType,
      hex: Array.from(p.raw)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexus-capture-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPcap = () => {
    try {
      const buf = buildPcap(displayed.length > 0 ? displayed : packets)
      const blob = new Blob([buf], { type: 'application/vnd.tcpdump.pcap' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexus-capture-${Date.now()}.pcap`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao exportar PCAP')
    }
  }

  // Keyboard: space = capture toggle, j/k navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (capturing) stopCapture()
        else startCapture()
        return
      }
      if (displayed.length === 0) return
      const idx = displayed.findIndex((p) => p.no === effectiveSelectedNo)
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFollowLatest(false)
        const next = displayed[Math.min(displayed.length - 1, Math.max(0, idx) + 1)]
        if (next) setSelectedNo(next.no)
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFollowLatest(false)
        const prev = displayed[Math.max(0, (idx < 0 ? 0 : idx) - 1)]
        if (prev) setSelectedNo(prev.no)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [displayed, effectiveSelectedNo, capturing, startCapture, stopCapture])

  return (
    <div className={styles.app}>
      <Toolbar
        interfaces={INTERFACES}
        selectedIface={selectedIface}
        capturing={capturing}
        hasPackets={packets.length > 0}
        packetRate={packetRate}
        onIfaceChange={setSelectedIface}
        onStart={startCapture}
        onStop={stopCapture}
        onClear={handleClear}
        onOpenFile={handleOpenFile}
        onRateChange={setPacketRate}
        onExportJson={handleExportJson}
        onExportPcap={handleExportPcap}
      />
      <FilterBar
        value={filter}
        valid={filterValid}
        onChange={setFilter}
        displayed={displayed.length}
        total={packets.length}
      />
      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}
      <div className={styles.listPane}>
        <PacketList
          packets={displayed}
          selectedNo={effectiveSelectedNo}
          onSelect={(no) => {
            setFollowLatest(false)
            setSelectedNo(no)
          }}
          autoScroll={capturing && followLatest && !filter.trim()}
        />
      </div>
      <div className={styles.bottom}>
        <div className={styles.detailsPane}>
          <PacketDetails layers={selected?.layers ?? []} empty={!selected} />
        </div>
        <div className={styles.messagePane}>
          <MessagePane
            packet={selected}
            packets={displayed}
            capturing={capturing}
            onSelectPacket={(no) => {
              setFollowLatest(false)
              setSelectedNo(no)
            }}
          />
        </div>
        <div className={styles.hexPane}>
          <HexDump data={selected?.raw ?? null} />
        </div>
      </div>
      <StatusBar
        capturing={capturing}
        ifaceName={iface.name}
        stats={stats}
        modeLabel={sourceLabel}
      />
    </div>
  )
}
