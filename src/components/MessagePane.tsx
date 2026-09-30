import { useEffect, useMemo, useRef, useState } from 'react'
import type { Packet } from '../types/packet'
import { decodePacketMessage, isLiveMessagePacket } from '../lib/message'
import styles from './MessagePane.module.css'

type ViewMode = 'live' | 'selected'

interface Props {
  packet: Packet | null
  packets: Packet[]
  capturing: boolean
  onSelectPacket: (no: number) => void
}

const MAX_LIVE = 200

export function MessagePane({ packet, packets, capturing, onSelectPacket }: Props) {
  const [mode, setMode] = useState<ViewMode>('live')
  const liveRef = useRef<HTMLDivElement>(null)
  const viewMode: ViewMode = capturing ? 'live' : mode

  const liveEntries = useMemo(() => {
    const interesting = packets.filter(isLiveMessagePacket)
    const slice = interesting.slice(-MAX_LIVE)
    return slice.map((p) => {
      const msg = decodePacketMessage(p)
      return {
        no: p.no,
        time: p.relativeTime,
        source: p.source,
        destination: p.destination,
        kind: msg.kind,
        summary: msg.summary,
      }
    })
  }, [packets])

  useEffect(() => {
    if (viewMode !== 'live' || !capturing || !liveRef.current) return
    liveRef.current.scrollTop = liveRef.current.scrollHeight
  }, [liveEntries.length, viewMode, capturing])

  const selectedMsg = packet ? decodePacketMessage(packet) : null

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>
        Message
        {capturing && <span className={styles.liveBadge}>LIVE</span>}
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'live'}
            className={viewMode === 'live' ? styles.tabActive : styles.tab}
            onClick={() => setMode('live')}
          >
            Stream
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'selected'}
            className={viewMode === 'selected' ? styles.tabActive : styles.tab}
            disabled={capturing}
            onClick={() => setMode('selected')}
          >
            Pacote
          </button>
        </div>
      </div>

      {viewMode === 'live' ? (
        <div className={styles.live} ref={liveRef}>
          {liveEntries.length === 0 ? (
            <p className={styles.empty}>
              {capturing
                ? 'Capturando… aguardando mensagens de aplicação (HTTP, DNS, ARP…).'
                : 'Clique em Start/Continuar para o stream ao vivo de mensagens.'}
            </p>
          ) : (
            liveEntries.map((entry) => (
              <button
                key={entry.no}
                type="button"
                className={`${styles.liveRow} ${packet?.no === entry.no ? styles.liveRowActive : ''}`}
                onClick={() => {
                  onSelectPacket(entry.no)
                  setMode('selected')
                }}
              >
                <span className={styles.liveMeta}>
                  #{entry.no} · {entry.time.toFixed(3)}s
                </span>
                <span className={styles.kind}>{entry.kind}</span>
                <span className={styles.liveSummary}>{entry.summary}</span>
                <span className={styles.liveEndpoints}>
                  {entry.source} → {entry.destination}
                </span>
              </button>
            ))
          )}
        </div>
      ) : !selectedMsg || !packet ? (
        <div className={styles.body}>
          <p className={styles.empty}>Selecione um pacote para ver a mensagem decodificada.</p>
        </div>
      ) : (
        <>
          <div className={styles.summary}>
            <span className={styles.kind}>{selectedMsg.kind}</span>
            <span>{selectedMsg.summary}</span>
          </div>
          <pre className={styles.body}>{selectedMsg.body}</pre>
        </>
      )}
    </div>
  )
}
