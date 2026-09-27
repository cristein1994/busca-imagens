import type { ReactNode } from 'react'
import styles from './PhoneShell.module.css'

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.stage}>
      <div className={styles.device}>
        <div className={styles.bezel}>
          <div className={styles.screen}>
            <div className={styles.island} aria-hidden="true" />
            <div className={styles.scroll}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
