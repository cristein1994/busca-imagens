import { useEffect, useRef } from 'react'
import type { ChatTurn, LibraryItem, Source } from '../types.ts'
import { Markdown } from './Markdown.tsx'
import styles from '../App.module.css'

type Props = {
  messages: ChatTurn[]
  reader: LibraryItem | null
  onCloseReader: () => void
  onSaveReport: (message: ChatTurn) => void
  onSaveSource: (message: ChatTurn, source: Source) => void
}

export function Thread({ messages, reader, onCloseReader, onSaveReport, onSaveSource }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, reader])

  if (reader) {
    return (
      <article className={styles.reader}>
        <div className={styles.readerBar}>
          <button type="button" className={styles.ghost} onClick={onCloseReader}>
            Voltar à conversa
          </button>
          <span className={styles.kind}>{reader.kind === 'page' ? 'Página' : 'Resposta'}</span>
        </div>
        <h2>{reader.title}</h2>
        {reader.url ? (
          <a href={reader.url} target="_blank" rel="noopener noreferrer">
            {reader.url}
          </a>
        ) : null}
        <div className={styles.readerBody}>
          <Markdown text={reader.content} />
        </div>
      </article>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={styles.hero}>
        <p className={styles.kicker}>Deep Search · Guarda web</p>
        <h2>Pergunte, pesquise na web e guarde o que importar.</h2>
        <p>
          Enviar fala com a DeepSeek. Deep Search monta consultas, lê páginas e responde com as fontes.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.thread}>
      {messages.map((message) => (
        <article
          key={message.id}
          className={message.role === 'user' ? styles.user : styles.assistant}
        >
          <header>
            <span>{message.role === 'user' ? 'Você' : 'DeepSeek'}</span>
            {message.role === 'assistant' && message.content && !message.pending ? (
              <button type="button" className={styles.ghost} onClick={() => onSaveReport(message)}>
                Guardar
              </button>
            ) : null}
          </header>
          {message.status ? <p className={styles.status}>{message.status}</p> : null}
          {message.queries.length > 0 ? (
            <ul className={styles.queries}>
              {message.queries.map((query) => (
                <li key={query}>{query}</li>
              ))}
            </ul>
          ) : null}
          {message.reasoning ? (
            <details className={styles.reasoning}>
              <summary>Raciocínio</summary>
              <pre>{message.reasoning}</pre>
            </details>
          ) : null}
          {message.content ? <Markdown text={message.content} /> : null}
          {message.sources.length > 0 ? (
            <ul className={styles.sources}>
              {message.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title || source.url}
                  </a>
                  {source.snippet ? <p>{source.snippet}</p> : null}
                  <button type="button" className={styles.ghost} onClick={() => onSaveSource(message, source)}>
                    Guardar página
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
      <div ref={endRef} />
    </div>
  )
}
