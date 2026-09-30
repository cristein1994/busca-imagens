import type { Packet } from '../types/packet'
import { decodePacketMessage } from '../lib/message'
import styles from './MessagePane.module.css'

interface Props {
  packet: Packet | null
}

export function MessagePane({ packet }: Props) {
  if (!packet) {
    return (
      <div className={styles.wrap}>
        <div className={styles.title}>Message</div>
        <div className={styles.body}>
          <p className={styles.empty}>Selecione um pacote para ver a mensagem decodificada.</p>
        </div>
      </div>
    )
  }

  const msg = decodePacketMessage(packet)

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>
        Message
        <span className={styles.kind}>{msg.kind}</span>
      </div>
      <div className={styles.summary}>{msg.summary}</div>
      <pre className={styles.body}>{msg.body}</pre>
    </div>
  )
}
