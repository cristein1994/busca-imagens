import { useEffect, useRef, useState } from 'react'
import type { CharacterConfig, ChatMessage } from '../types/generator'
import { buildCharacterPrompt } from '../lib/promptBuilder'
import { chatWithCharacter } from '../lib/pollinations'

interface ChatPanelProps {
  character: CharacterConfig
}

export function ChatPanel({ character }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Oi… me descreva o clima que você quer. Posso flertar, roleplay NSFW, o que preferir (18+).',
      createdAt: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }

    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const reply = await chatWithCharacter(
        next
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
        buildCharacterPrompt(character),
      )
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply || '…',
          createdAt: Date.now(),
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no chat')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="layout">
      <aside className="panel">
        <h2>Soul Chat</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 0 }}>
          Chat adulto com o personagem atual do builder. NSFW liberado.
        </p>
        <div className="prompt-preview">{buildCharacterPrompt(character)}</div>
      </aside>
      <section className="panel">
        <div className="chat-log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="bubble assistant">
              <span className="spinner" style={{ width: 18, height: 18, margin: 0 }} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="chat-input">Mensagem</label>
          <textarea
            id="chat-input"
            value={input}
            rows={3}
            placeholder="Escreva sua mensagem…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: 'auto', minWidth: 140 }}
            disabled={loading || !input.trim()}
            onClick={() => void send()}
          >
            Enviar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: 'Conversa reiniciada. O que você quer explorar?',
                  createdAt: Date.now(),
                },
              ])
            }
          >
            Reiniciar
          </button>
        </div>
      </section>
    </div>
  )
}
