import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getStatus, streamChat } from './api/client.ts'
import type { ChatTurn, StatusPayload, StreamEvent } from './types.ts'
import styles from './App.module.css'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const WELCOME: ChatTurn = {
  id: 'welcome',
  role: 'assistant',
  content:
    'DarkGPT online. Tools de internet saem pelo Tor (web_search, fetch_url, tor_status). Configure Ollama local ou OPENAI_* no .env e pergunte o que quiser.',
  tools: [],
  status: '',
  pending: false,
  error: false,
}

export default function App() {
  const [messages, setMessages] = useState<ChatTurn[]>([WELCOME])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [liveStatus, setLiveStatus] = useState('')
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const refreshStatus = async () => {
    try {
      setStatus(await getStatus())
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => {
    void refreshStatus()
    const t = setInterval(() => void refreshStatus(), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveStatus])

  function applyEvent(id: string, event: StreamEvent) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== id) return message
        if (event.type === 'status') return { ...message, status: event.message }
        if (event.type === 'token') {
          return { ...message, content: message.content + event.text, status: '' }
        }
        if (event.type === 'tool') {
          return {
            ...message,
            tools: [...message.tools, { name: event.name, args: event.args, result: event.result }],
            status: '',
          }
        }
        if (event.type === 'error') {
          return {
            ...message,
            pending: false,
            error: true,
            content: message.content || event.message,
            status: '',
          }
        }
        return { ...message, pending: false, status: '' }
      }),
    )
    if (event.type === 'status') setLiveStatus(event.message)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return

    const userId = uid()
    const assistantId = uid()
    const history = [...messages, { id: userId, role: 'user' as const, content: text }]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => m.content.trim() && m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }))

    setInput('')
    setBusy(true)
    setLiveStatus('connecting…')
    setMessages((prev) => [
      ...prev,
      {
        id: userId,
        role: 'user',
        content: text,
        tools: [],
        status: '',
        pending: false,
        error: false,
      },
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        tools: [],
        status: 'connecting…',
        pending: true,
        error: false,
      },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat(history, controller.signal, (event) => applyEvent(assistantId, event))
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, pending: false, status: '' } : m)),
      )
    } catch (err) {
      if (controller.signal.aborted) return
      const message = err instanceof Error ? err.message : String(err)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                pending: false,
                error: true,
                content:
                  m.content ||
                  `Erro: ${message}\n\nDica: suba Ollama (\`ollama serve\` + \`ollama pull llama3.2\`) e Tor (\`npm run tor:start\`). Ou defina OPENAI_BASE_URL + OPENAI_API_KEY.`,
              }
            : m,
        ),
      )
    } finally {
      setBusy(false)
      setLiveStatus('')
      abortRef.current = null
      void refreshStatus()
    }
  }

  function onStop() {
    abortRef.current?.abort()
    setBusy(false)
    setLiveStatus('')
  }

  function onClear() {
    if (busy) return
    setMessages([WELCOME])
  }

  const tor = status?.tor
  const llm = status?.llm

  return (
    <div className={styles.shell}>
      <header>
        <div className={styles.scanline} />
        <p className={styles.eyebrow}>deep circuit · operator console</p>
        <h1 className={styles.brand}>DarkGPT</h1>
        <p className={styles.tagline}>
          Playground local: chat com LLM OpenAI-compatible e tools de busca/fetch roteadas pelo Tor.
        </p>
      </header>

      <div className={styles.statusRow}>
        <span className={styles.pill}>
          <span
            className={`${styles.dot} ${tor?.isTor ? styles.dotOk : tor?.ok === false ? styles.dotBad : styles.dotWarn}`}
          />
          Tor{' '}
          {tor?.isTor
            ? `exit ${tor.ip ?? 'ok'}`
            : tor?.error
              ? 'offline'
              : `${tor?.host ?? '127.0.0.1'}:${tor?.port ?? 9050}`}
        </span>
        <span className={styles.pill}>
          <span
            className={`${styles.dot} ${llm?.ok ? styles.dotOk : llm ? styles.dotBad : styles.dotWarn}`}
          />
          LLM {llm ? `${llm.provider}/${llm.model}` : '…'}
        </span>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => void refreshStatus()}>
          refresh
        </button>
      </div>

      <div className={styles.thread}>
        {messages.map((m) => (
          <article
            key={m.id}
            className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}
          >
            <p className={styles.role}>{m.role === 'user' ? 'operator' : 'darkgpt'}</p>
            <p className={styles.content}>
              {m.content || (m.pending ? '…' : '')}
            </p>
            {m.tools.length > 0 && (
              <div className={styles.tools}>
                {m.tools.map((tool, i) => (
                  <div key={`${tool.name}-${i}`} className={styles.tool}>
                    <div className={styles.toolName}>
                      ⌁ {tool.name}
                    </div>
                    <pre className={styles.toolBody}>{tool.result.slice(0, 1200)}</pre>
                  </div>
                ))}
              </div>
            )}
            {m.pending && m.status ? <p className={styles.statusLine}>{m.status}</p> : null}
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <p className={styles.statusLine}>{liveStatus || '\u00a0'}</p>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo… (ex: verifique o Tor e busque notícias sobre X)"
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void onSubmit(e)
            }
          }}
        />
        <div className={styles.actions}>
          <button className={styles.btn} type="submit" disabled={busy || !input.trim()}>
            send
          </button>
          {busy ? (
            <button className={`${styles.btn} ${styles.btnGhost}`} type="button" onClick={onStop}>
              stop
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.btnGhost}`} type="button" onClick={onClear}>
              clear
            </button>
          )}
          <p className={styles.hint}>Enter envia · Shift+Enter quebra linha</p>
        </div>
      </form>
    </div>
  )
}
