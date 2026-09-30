import { toHexRows } from '../lib/hex'
import styles from './HexDump.module.css'

interface Props {
  data: Uint8Array | null
}

export function HexDump({ data }: Props) {
  const rows = data ? toHexRows(data) : []

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Packet Bytes</div>
      <div className={styles.body}>
        {!data || rows.length === 0 ? (
          <p className={styles.empty}>Hex dump aparece ao selecionar um pacote.</p>
        ) : (
          <pre className={styles.pre}>
            {rows.map((row) => (
              <div key={row.offset} className={styles.row}>
                <span className={styles.offset}>{row.offset}</span>
                <span className={styles.hex}>{row.hex.join(' ')}</span>
                <span className={styles.ascii}>{row.ascii}</span>
              </div>
            ))}
          </pre>
        )}
      </div>
    </div>
  )
}
