import styles from './AgeGate.module.css'

interface AgeGateProps {
  onEnter: () => void
}

export function AgeGate({ onEnter }: AgeGateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.brand}>BOYRADAR</p>
        <h1>Conteúdo adulto</h1>
        <p className={styles.lead}>
          Buscador de garotos de programa / acompanhantes masculinos. Entrada só para quem tem{' '}
          <strong>21 anos ou mais</strong>.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onEnter}>
            Tenho 21+ — entrar
          </button>
          <a className={styles.leave} href="https://www.google.com">
            Sair
          </a>
        </div>
      </div>
    </div>
  )
}
