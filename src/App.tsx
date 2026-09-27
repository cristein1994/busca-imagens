import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { pushSse } from '../shared/sse.ts'
import type { Session, Turn } from '../shared/types.ts'
import styles from './App.module.css'

type Status = {
  session: Session
  keyConfigured: boolean
}

const BANNER = `RODE  ·  terminal grok
digite uma pergunta ou /help`

export default function App() {
  const [status, setStatus] = useState<Status | null>(null)
  const [draft, setDraft] = useState('')
  const [live, setLive] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const history = useRef<string[]>([])
  const historyAt = useRef(0)

  useEffect(() => {
    void refresh()
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [status, live, error])

  async function refresh() {
    const response = await fetch('/api/session')
    const body = (await response.json()) as Status
    setStatus(body)
  }

  async function submit(text: string) {
    const line = text.trim()
    if (!line || busy) return
    setError('')
    history.current.push(line)
    historyAt.current = history.current.length
    setDraft('')

    if (line.startsWith('/')) {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line }),
      })
      const body = (await response.json()) as Status & { error?: string; exit?: boolean }
      if (!response.ok) {
        setError(body.error ?? 'comando recusado')
        return
      }
      setStatus({ session: body.session, keyConfigured: status?.keyConfigured ?? false })
      if (body.exit) setError('no navegador a sessão fica aberta. no terminal, /exit encerra o processo.')
      return
    }

    setBusy(true)
    setLive('')
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: line }),
      })
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'não foi possível falar com o Grok')
        await refresh()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''
      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
        if (done && buffer.trim()) buffer += '\n\n'
        const parsed = pushSse(buffer, '')
        buffer = parsed.buffer
        for (const event of parsed.events) {
          const payload = JSON.parse(event.data) as { kind?: string; text?: string; message?: string }
          if (payload.kind === 'delta' && payload.text) {
            acc += payload.text
            setLive(acc)
          }
          if (payload.kind === 'error' && payload.message) setError(payload.message)
        }
        if (done) break
      }
      setLive('')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'falha de rede')
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit(draft)
      return
    }
    if (event.key === 'ArrowUp' && inputRef.current?.selectionStart === 0) {
      event.preventDefault()
      const next = Math.max(0, historyAt.current - 1)
      historyAt.current = next
      setDraft(history.current[next] ?? '')
    }
    if (event.key === 'ArrowDown' && inputRef.current) {
      const end = inputRef.current.value.length
      if (inputRef.current.selectionStart !== end) return
      event.preventDefault()
      const next = Math.min(history.current.length, historyAt.current + 1)
      historyAt.current = next
      setDraft(history.current[next] ?? '')
    }
  }

  const session = status?.session
  const turns = session?.turns ?? []

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <div className={styles.brand}>
          <span className={styles.mark}>RODE</span>
          <span>terminal grok</span>
        </div>
        <div className={styles.meta}>
          <span>{session?.model ?? '…'}</span>
          <span className={status?.keyConfigured ? styles.ok : styles.warn}>
            {status ? (status.keyConfigured ? 'chave ok' : 'sem chave') : '…'}
          </span>
          <span>{session?.search ? 'busca on' : 'busca off'}</span>
        </div>
      </header>

      <div className={styles.scroll} ref={scrollRef}>
        {turns.length === 0 && !live && <pre className={styles.banner}>{BANNER}</pre>}
        {turns.map((turn, index) => (
          <TurnView key={`${turn.at}-${index}`} turn={turn} />
        ))}
        {live && (
          <pre className={styles.assistant}>
            {live}
            <span className={styles.cursor}> </span>
          </pre>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <form
        className={styles.prompt}
        onSubmit={(event) => {
          event.preventDefault()
          void submit(draft)
        }}
      >
        <label htmlFor="rode-line">rode&gt;</label>
        <textarea
          id="rode-line"
          ref={inputRef}
          rows={1}
          value={draft}
          disabled={busy}
          placeholder={busy ? 'gerando…' : '/help'}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </form>
    </div>
  )
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === 'user') return <pre className={styles.user}>rode&gt; {turn.text}</pre>
  if (turn.role === 'note') return <pre className={styles.note}>{turn.text}</pre>
  return <pre className={styles.assistant}>{turn.text}</pre>
}
