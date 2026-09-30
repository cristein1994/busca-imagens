import styles from './FilterBar.module.css'

interface Props {
  value: string
  valid: boolean
  onChange: (value: string) => void
  displayed: number
  total: number
}

export function FilterBar({ value, valid, onChange, displayed, total }: Props) {
  return (
    <div className={styles.bar}>
      <label className={styles.label} htmlFor="display-filter">
        Display Filter
      </label>
      <input
        id="display-filter"
        className={`${styles.input} ${value && !valid ? styles.invalid : value ? styles.valid : ''}`}
        value={value}
        placeholder="tcp || dns || ip.addr == 192.168.1.10"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      <span className={styles.count}>
        {displayed}/{total}
      </span>
    </div>
  )
}
