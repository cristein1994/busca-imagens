import { useEffect, useId, useRef, useState } from 'react'
import { fetchGrokStatus, sendGrokMessage, type GrokChatMessage } from '../api/grok'
import styles from './GrokBot.module.css'

interface GrokBotProps {
  onSearch: (query: string) => void
  searchEnabled: boolean
  searching: boolean
}

interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  searchQuery?: string | null
}

type PanelStatus = 'closed' | 'checking' | 'ready' | 'missing-key' | 'offline'

const SUGGESTIONS = ['Pôr do sol na praia', 'Arquitetura minimalista', 'Floresta com névoa']

export function GrokBot({ onSearch, searchEnabled, searching }: GrokBotProps) {
  const inputId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [panelStatus, setPanelStatus] = useState<PanelStatus>('closed')
  const [model, setModel] = useState('grok-4.7')
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open || panelStatus !== 'ready') return
    inputRef.current?.focus()
  }, [open, panelStatus])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [messages, sending, open])

  async function openPanel() {
    setOpen(true)
    if (panelStatus === 'ready' || panelStatus === 'missing-key') return
    setPanelStatus('checking')
    setError('')
    try {
      const status = await fetchGrokStatus()
      setModel(status.model)
      setPanelStatus(status.configured ? 'ready' : 'missing-key')
    } catch {
      setPanelStatus('offline')
    }
  }

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    void openPanel()
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending || panelStatus !== 'ready') return

    const history: GrokChatMessage[] = [
      ...messages.map((message) => ({ role: message.role, content: message.content })),
      { role: 'user', content: trimmed },
    ]
    const userMessage: UiMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setSending(true)
    setError('')

    try {
      const result = await sendGrokMessage(history)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.reply,
          searchQuery: result.searchQuery,
        },
      ])
      if (result.searchQuery && searchEnabled) {
        onSearch(result.searchQuery)
      }
    } catch (err) {
      setMessages((current) => current.filter((message) => message.id !== userMessage.id))
      setInput(trimmed)
      setError(err instanceof Error ? err.message : 'Erro ao falar com o Grok.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {open && (
        <section
          className={panelStatus === 'ready' ? `${styles.panel} ${styles.panelChat}` : styles.panel}
          role="dialog"
          aria-modal="false"
          aria-labelledby="grok-title"
        >
          <header className={styles.header}>
            <div>
              <h2 id="grok-title" className={styles.title}>
                Grok
              </h2>
              <p className={styles.caption}>
                {panelStatus === 'ready' ? `Assistente · ${model}` : 'Assistente de busca'}
              </p>
            </div>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Fechar Grok">
              ×
            </button>
          </header>

          {panelStatus === 'checking' && (
            <p className={styles.status} role="status">
              Conectando ao Grok…
            </p>
          )}

          {panelStatus === 'offline' && (
            <div className={styles.setup}>
              <p>O servidor do Grok não respondeu. Rode o app com <code>npm run dev</code>.</p>
            </div>
          )}

          {panelStatus === 'missing-key' && (
            <div className={styles.setup}>
              <h3>Configure o Grok</h3>
              <ol>
                <li>
                  Crie uma API key em{' '}
                  <a href="https://console.x.ai/" target="_blank" rel="noopener noreferrer">
                    console.x.ai
                  </a>
                </li>
                <li>
                  No arquivo <code>.env</code>, defina <code>XAI_API_KEY</code>
                </li>
                <li>
                  Reinicie com <code>npm run dev</code>
                </li>
              </ol>
              <p>A chave fica só no servidor e não entra no navegador.</p>
            </div>
          )}

          {panelStatus === 'ready' && (
            <>
              <div ref={listRef} className={styles.messages} aria-live="polite">
                {messages.length === 0 && (
                  <div className={styles.welcome}>
                    <p>Diga o que você quer ver. Eu monto a busca e trago as fotos.</p>
                    <div className={styles.suggestions}>
                      {SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={styles.suggestion}
                          onClick={() => void send(suggestion)}
                          disabled={sending}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={message.role === 'user' ? styles.user : styles.assistant}
                  >
                    <p>{message.content}</p>
                    {message.searchQuery && (
                      <button
                        type="button"
                        className={styles.searchChip}
                        onClick={() => onSearch(message.searchQuery!)}
                        disabled={!searchEnabled || searching}
                      >
                        Buscar “{message.searchQuery}”
                      </button>
                    )}
                  </article>
                ))}

                {sending && (
                  <p className={styles.typing} role="status">
                    Grok está pensando…
                  </p>
                )}
              </div>

              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}

              {!searchEnabled && (
                <p className={styles.note}>Configure a chave do Unsplash para eu poder buscar as fotos.</p>
              )}

              <form
                className={styles.composer}
                onSubmit={(event) => {
                  event.preventDefault()
                  void send(input)
                }}
              >
                <label className={styles.srOnly} htmlFor={inputId}>
                  Mensagem para o Grok
                </label>
                <textarea
                  id={inputId}
                  ref={inputRef}
                  className={styles.input}
                  rows={2}
                  value={input}
                  placeholder="Descreva a foto…"
                  disabled={sending}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void send(input)
                    }
                  }}
                />
                <button className={styles.send} type="submit" disabled={sending || !input.trim()}>
                  {sending ? '…' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        className={styles.launcher}
        onClick={toggle}
        aria-expanded={open}
        aria-controls="grok-title"
      >
        <span className={styles.mark} aria-hidden="true">
          G
        </span>
        {open ? 'Fechar' : 'Grok'}
      </button>
    </>
  )
}
