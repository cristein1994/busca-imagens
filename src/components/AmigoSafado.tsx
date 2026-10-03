import { useEffect, useRef, useState } from 'react'
import type { GpProfile } from '../types/gp'
import {
  amigoReply,
  type ChatMessage,
  welcomeMessage,
} from '../lib/amigoSafado'
import styles from './AmigoSafado.module.css'

interface AmigoSafadoProps {
  catalog: GpProfile[]
  scraping: boolean
  lastScrape?: { count: number; errors: string[] }
  onScrape: () => void
  onPickName?: (name: string) => void
}

let msgId = 0
function mid(): string {
  msgId += 1
  return `m_${msgId}`
}

export function AmigoSafado({
  catalog,
  scraping,
  lastScrape,
  onScrape,
}: AmigoSafadoProps) {
  const [open, setOpen] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: mid(), role: 'amigo', text: welcomeMessage() },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (!lastScrape) return
    setMessages((prev) => [
      ...prev,
      {
        id: mid(),
        role: 'amigo',
        text: amigoReply('scrap feito', catalog, lastScrape),
      },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastScrape])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [...prev, { id: mid(), role: 'voce', text: trimmed }])
    setInput('')

    if (/scrap|atualiz|puxa.*web/.test(trimmed.toLowerCase())) {
      onScrape()
      setMessages((prev) => [
        ...prev,
        {
          id: mid(),
          role: 'amigo',
          text: 'Tô vasculhando os classificados… segura esse pau aí.',
        },
      ])
      return
    }

    const reply = amigoReply(trimmed, catalog)
    setMessages((prev) => [...prev, { id: mid(), role: 'amigo', text: reply }])
  }

  return (
    <aside className={styles.wrap} aria-label="Amigo safado">
      <header className={styles.head}>
        <div>
          <strong>Amigo Safado</strong>
          <span>gay · puto · te ajuda a escolher GP</span>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)}>
          {open ? 'Minimizar' : 'Abrir'}
        </button>
      </header>

      {open ? (
        <>
          <div className={styles.quick}>
            <button type="button" onClick={() => send('top 5 pra mamar em Uberaba')}>
              Top 5 mamar
            </button>
            <button type="button" onClick={() => send('ativo dotado Uberlândia')}>
              Dotado UDI
            </button>
            <button type="button" onClick={() => send('monta zap')}>
              Monta zap
            </button>
            <button type="button" disabled={scraping} onClick={onScrape}>
              {scraping ? 'Scrapando…' : 'Scrap web'}
            </button>
          </div>

          <div className={styles.thread}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === 'amigo' ? styles.amigo : styles.voce}
              >
                <pre>{m.text}</pre>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: quero mamar ativo grosso em Uberaba"
              aria-label="Mensagem pro amigo safado"
            />
            <button type="submit">Mandar</button>
          </form>
        </>
      ) : null}
    </aside>
  )
}
