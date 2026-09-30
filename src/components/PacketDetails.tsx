import type { ProtocolField } from '../types/packet'
import styles from './PacketDetails.module.css'

interface Props {
  layers: ProtocolField[]
  empty?: boolean
}

function FieldNode({ field, depth = 0 }: { field: ProtocolField; depth?: number }) {
  if (field.children && field.children.length > 0) {
    return (
      <details className={styles.node} open={depth < 2} style={{ marginLeft: depth * 0.75 }}>
        <summary>
          <span className={styles.label}>{field.label}</span>
          <span className={styles.value}>{field.value}</span>
        </summary>
        <div className={styles.children}>
          {field.children.map((child, i) => (
            <FieldNode key={`${child.label}-${i}`} field={child} depth={depth + 1} />
          ))}
        </div>
      </details>
    )
  }

  return (
    <div className={styles.leaf} style={{ marginLeft: depth * 0.75 }}>
      <span className={styles.label}>{field.label}</span>
      <span className={styles.value}>{field.value}</span>
    </div>
  )
}

export function PacketDetails({ layers, empty }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Packet Details</div>
      <div className={styles.body}>
        {empty || layers.length === 0 ? (
          <p className={styles.empty}>Selecione um pacote para inspecionar as camadas.</p>
        ) : (
          layers.map((layer, i) => <FieldNode key={`${layer.label}-${i}`} field={layer} />)
        )}
      </div>
    </div>
  )
}
