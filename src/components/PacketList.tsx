import { useEffect, useRef } from 'react'
import type { Packet } from '../types/packet'
import { protocolColor } from '../lib/simulator'
import { formatRelativeTime } from '../lib/hex'
import styles from './PacketList.module.css'

interface Props {
  packets: Packet[]
  selectedNo: number | null
  onSelect: (no: number) => void
  autoScroll: boolean
}

export function PacketList({ packets, selectedNo, onSelect, autoScroll }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!autoScroll || !bodyRef.current) return
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [packets.length, autoScroll])

  return (
    <div className={styles.wrap}>
      <div className={styles.head} role="row">
        <span>No.</span>
        <span>Time</span>
        <span>Source</span>
        <span>Destination</span>
        <span>Protocol</span>
        <span>Length</span>
        <span>Info</span>
      </div>
      <div className={styles.body} ref={bodyRef} role="listbox" aria-label="Packet list">
        {packets.length === 0 && (
          <div className={styles.empty}>
            Nenhum pacote. Clique em <strong>Start</strong> para captura ao vivo ou abra um arquivo{' '}
            <strong>PCAP</strong>.
          </div>
        )}
        {packets.map((pkt) => {
          const colors = protocolColor(pkt.protocol)
          const selected = pkt.no === selectedNo
          return (
            <button
              key={pkt.no}
              type="button"
              role="option"
              aria-selected={selected}
              className={`${styles.row} ${selected ? styles.selected : ''}`}
              style={{ background: selected ? '#c8dff0' : colors.bg, color: colors.fg }}
              onClick={() => onSelect(pkt.no)}
            >
              <span>{pkt.no}</span>
              <span>{formatRelativeTime(pkt.relativeTime)}</span>
              <span title={pkt.source}>{pkt.source}</span>
              <span title={pkt.destination}>{pkt.destination}</span>
              <span>{pkt.protocol}</span>
              <span>{pkt.length}</span>
              <span title={pkt.info}>{pkt.info}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
