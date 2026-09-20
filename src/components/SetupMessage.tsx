import styles from './SetupMessage.module.css'

export function SetupMessage() {
  return (
    <div className={styles.box} role="alert">
      <h2 className={styles.title}>Configuração necessária</h2>
      <p className={styles.text}>
        Para buscar imagens, configure a chave da API do Unsplash.
      </p>
      <ol className={styles.steps}>
        <li>
          Crie uma conta e um app em{' '}
          <a
            href="https://unsplash.com/developers"
            target="_blank"
            rel="noopener noreferrer"
          >
            unsplash.com/developers
          </a>
        </li>
        <li>
          Copie o arquivo <code>.env.example</code> para <code>.env</code>
        </li>
        <li>
          Defina <code>VITE_UNSPLASH_ACCESS_KEY</code> com a sua Access Key
        </li>
        <li>Reinicie o servidor com <code>npm run dev</code></li>
      </ol>
    </div>
  )
}
