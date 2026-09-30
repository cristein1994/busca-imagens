import type { CaptureInterface } from '../types/packet'
import { FILTER_EXAMPLES } from '../lib/filter'
import styles from './Toolbar.module.css'

interface Props {
  interfaces: CaptureInterface[]
  selectedIface: string
  capturing: boolean
  hasPackets: boolean
  packetRate: number
  onIfaceChange: (id: string) => void
  onStart: () => void
  onStop: () => void
  onClear: () => void
  onOpenFile: (file: File) => void
  onRateChange: (rate: number) => void
  onExport: () => void
}

export function Toolbar({
  interfaces,
  selectedIface,
  capturing,
  hasPackets,
  packetRate,
  onIfaceChange,
  onStart,
  onStop,
  onClear,
  onOpenFile,
  onRateChange,
  onExport,
}: Props) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden>
          ◈
        </span>
        <div>
          <strong>Nexus Capture</strong>
          <span className={styles.sub}>packet analyzer</span>
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>
          Interface
          <select
            value={selectedIface}
            onChange={(e) => onIfaceChange(e.target.value)}
            disabled={capturing}
          >
            {interfaces.map((iface) => (
              <option key={iface.id} value={iface.id}>
                {iface.name} — {iface.description}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          pps
          <input
            type="number"
            min={1}
            max={200}
            value={packetRate}
            disabled={capturing}
            onChange={(e) => onRateChange(Number(e.target.value) || 1)}
          />
        </label>
      </div>

      <div className={styles.actions}>
        {!capturing ? (
          <button type="button" className={styles.start} onClick={onStart}>
            {hasPackets ? '▶ Continuar' : '▶ Start'}
          </button>
        ) : (
          <button type="button" className={styles.stop} onClick={onStop}>
            ■ Stop
          </button>
        )}
        <button type="button" onClick={onClear} disabled={capturing}>
          Clear
        </button>
        <label className={styles.fileBtn}>
          Open PCAP
          <input
            type="file"
            accept=".pcap,.cap,application/vnd.tcpdump.pcap,application/octet-stream"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onOpenFile(f)
              e.target.value = ''
            }}
          />
        </label>
        <button type="button" onClick={onExport}>
          Export JSON
        </button>
      </div>

      <details className={styles.help}>
        <summary>Filtros</summary>
        <ul>
          {FILTER_EXAMPLES.map((ex) => (
            <li key={ex}>
              <code>{ex}</code>
            </li>
          ))}
        </ul>
      </details>
    </header>
  )
}
