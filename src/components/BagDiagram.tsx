import type { BagColor } from '../data/catalog'
import styles from './BagDiagram.module.css'

type Props = {
  color: BagColor
  bagWidthMm: number
  bagHeightMm: number
  phoneWidthMm: number
  phoneHeightMm: number
  pocketWidthMm: number | null
  pocketHeightMm: number | null
  phoneFitsPocket: boolean | null
}

export function BagDiagram({
  color,
  bagWidthMm,
  bagHeightMm,
  phoneWidthMm,
  phoneHeightMm,
  pocketWidthMm,
  pocketHeightMm,
  phoneFitsPocket,
}: Props) {
  const viewW = 320
  const pad = 24
  const spanW = Math.max(bagWidthMm, pocketWidthMm ?? 0, phoneWidthMm)
  const spanH = Math.max(bagHeightMm, pocketHeightMm ?? 0, phoneHeightMm)
  const scale = (viewW - pad * 2) / spanW
  const viewH = Math.ceil(spanH * scale + 48)

  const bagW = bagWidthMm * scale
  const bagH = bagHeightMm * scale
  const bagX = (viewW - bagW) / 2
  const bagY = 28

  const pocketW = pocketWidthMm == null ? 0 : pocketWidthMm * scale
  const pocketH = pocketHeightMm == null ? 0 : pocketHeightMm * scale
  const showPocket = pocketWidthMm != null && pocketHeightMm != null
  const pocketX = (viewW - pocketW) / 2
  const pocketY = bagY + bagH / 2 - pocketH / 2

  const phoneW = phoneWidthMm * scale
  const phoneH = phoneHeightMm * scale
  const anchorX = showPocket ? pocketX + pocketW / 2 : bagX + bagW / 2
  const anchorY = showPocket ? pocketY + pocketH / 2 : bagY + bagH * 0.58
  const phoneX = anchorX - phoneW / 2
  const phoneY = anchorY - phoneH / 2
  const phoneStroke = phoneFitsPocket == null ? '#f4efe8' : phoneFitsPocket ? '#1d6b45' : '#9d2c2c'

  const gradId = `leather-${color.id}`

  return (
    <figure className={styles.wrap}>
      <svg
        className={styles.canvas}
        viewBox={`0 0 ${viewW} ${viewH}`}
        role="img"
        aria-label="Bolsa Pponak e iPhone desenhados na mesma escala"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color.leather[0]} />
            <stop offset="1" stopColor={color.leather[1]} />
          </linearGradient>
        </defs>

        <path
          d={`M ${bagX + 28} ${bagY + 8} C ${bagX + 20} 8, ${bagX + bagW - 20} 8, ${bagX + bagW - 28} ${bagY + 8}`}
          fill="none"
          stroke={color.leather[1]}
          strokeWidth="8"
          strokeLinecap="round"
        />

        <rect
          x={bagX}
          y={bagY}
          width={bagW}
          height={bagH}
          rx="18"
          fill={`url(#${gradId})`}
        />
        <path
          d={`M ${bagX} ${bagY + bagH * 0.22} H ${bagX + bagW}`}
          stroke={color.stitch}
          strokeWidth="1.5"
          opacity="0.7"
        />
        <rect
          x={bagX + 10}
          y={bagY + 10}
          width={bagW - 20}
          height={bagH - 20}
          rx="12"
          fill="none"
          stroke={color.stitch}
          strokeWidth="1.25"
          strokeDasharray="3 4"
          opacity="0.8"
        />
        <rect
          x={bagX + bagW / 2 - 10}
          y={bagY + bagH * 0.22 - 4}
          width="20"
          height="8"
          rx="2"
          fill="#c9a06a"
        />

        {showPocket && (
          <rect
            x={pocketX}
            y={pocketY}
            width={pocketW}
            height={pocketH}
            rx="6"
            fill="rgba(255,255,255,0.16)"
            stroke="#1c140f"
            strokeDasharray="4 3"
            strokeWidth="1.4"
          />
        )}

        <rect
          x={phoneX}
          y={phoneY}
          width={phoneW}
          height={phoneH}
          rx={Math.min(8, phoneW / 5)}
          fill="#1c140f"
          stroke={phoneStroke}
          strokeWidth="2"
        />
        <rect
          x={phoneX + phoneW * 0.08}
          y={phoneY + phoneH * 0.08}
          width={phoneW * 0.84}
          height={phoneH * 0.78}
          rx="2"
          fill="#d7deea"
        />
      </svg>
      <ul className={styles.legend}>
        <li>
          <span className={styles.swatch} style={{ background: color.leather[1] }} />
          Corpo da bolsa
        </li>
        {showPocket && (
          <li>
            <span className={`${styles.swatch} ${styles.pocket}`} />
            Bolso medido
          </li>
        )}
        <li>
          <span className={`${styles.swatch} ${styles.phone}`} />
          iPhone
        </li>
      </ul>
      <figcaption className={styles.note}>
        Mesma escala. A posição do aparelho é só para leitura; o bolso real fica por dentro.
      </figcaption>
    </figure>
  )
}
