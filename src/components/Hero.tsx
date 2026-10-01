import styles from './Hero.module.css'

interface HeroProps {
  onStart: () => void
}

export function Hero({ onStart }: HeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.inner}>
        <p className={styles.brand}>PROMPTOR</p>
        <div className={styles.line} aria-hidden />
        <h1 className={styles.headline}>
          Forje prompts densos,
          <br />
          personagens e safadeza.
        </h1>
        <p className={styles.lead}>
          Identidade, kinks, heat e instruções — inclusive RP gay explícito 21+ — num system
          prompt pronto pra colar no ChatGPT, Claude, Gemini ou no seu agente.
        </p>
        <div className={styles.cta}>
          <button type="button" className={styles.primary} onClick={onStart}>
            Abrir estúdio
          </button>
          <a className={styles.secondary} href="#presets">
            Ver presets
          </a>
        </div>
      </div>
    </header>
  )
}
