import type { CaptureStats } from '../types/packet'
import styles from './StatusBar.module.css'

interface Props {
  capturing: boolean
  ifaceName: string
  stats: CaptureStats
  modeLabel: string
}

export function StatusBar({ capturing, ifaceName, stats, modeLabel }: Props) {
  const topProtocols = Object.entries(stats.byProtocol)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <footer className={styles.bar}>
      <span className={`${styles.dot} ${capturing ? styles.live : ''}`} aria-hidden />
      <span>{capturing ? 'Capturando' : 'Parado'}</span>
      <span className={styles.sep}>|</span>
      <span>{ifaceName}</span>
      <span className={styles.sep}>|</span>
      <span>{modeLabel}</span>
      <span className={styles.sep}>|</span>
      <span>
        Packets: {stats.displayed}/{stats.total}
      </span>
      <span className={styles.sep}>|</span>
      <span>{(stats.bytes / 1024).toFixed(1)} KB</span>
      {topProtocols.length > 0 && (
        <>
          <span className={styles.sep}>|</span>
          <span className={styles.protos}>
            {topProtocols.map(([p, n]) => (
              <span key={p}>
                {p}:{n}
              </span>
            ))}
          </span>
        </>
      )}
    </footer>
  )
}
