import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchPage,
  getHealth,
  getLibrary,
  getModelfile,
  postLibraryItem,
  putModelfile,
  removeLibraryItem,
  streamChat,
  streamDeepSearch,
} from './api/client.ts'
import { Sidebar } from './components/Sidebar.tsx'
import { Thread } from './components/Thread.tsx'
import { parseModelfile } from './modelfile.ts'
import type { ChatTurn, LibraryItem, PageDraft, Source, StreamEvent } from './types.ts'
import styles from './App.module.css'

const EMPTY_TURN: Omit<ChatTurn, 'id' | 'role' | 'content' | 'query'> = {
  reasoning: '',
  sources: [],
  queries: [],
  status: '',
  pending: false,
  error: false,
}

export default function App() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [model, setModel] = useState('deepseek-chat')
  const [raw, setRaw] = useState('')
  const [savingModelfile, setSavingModelfile] = useState(false)
  const [items, setItems] = useState<LibraryItem[]>([])
  const [reader, setReader] = useState<LibraryItem | null>(null)
  const [draft, setDraft] = useState<PageDraft | null>(null)
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState('')
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const refreshLibrary = useCallback(async () => {
    setItems(await getLibrary())
  }, [])

  useEffect(() => {
    void getHealth()
      .then((health) => setConfigured(health.configured))
      .catch(() => setConfigured(false))
    void getModelfile()
      .then((file) => setRaw(file.raw))
      .catch(() => setNotice('Não foi possível ler o modelfile.'))
    void getLibrary()
      .then((library) => setItems(library))
      .catch(() => setNotice('Não foi possível abrir a Guarda web.'))
  }, [])

  function applyEvent(id: string, event: StreamEvent) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== id) return message
        if (event.type === 'status') return { ...message, status: event.message }
        if (event.type === 'queries') return { ...message, queries: event.queries }
        if (event.type === 'sources') return { ...message, sources: event.sources, status: '' }
        if (event.type === 'delta') return { ...message, content: message.content + event.content }
        if (event.type === 'reasoning') {
          return { ...message, reasoning: message.reasoning + event.content }
        }
        if (event.type === 'error') {
          return {
            ...message,
            pending: false,
            error: true,
            status: message.content ? event.message : '',
            content: message.content || event.message,
          }
        }
        return { ...message, pending: false, status: message.error ? message.status : '' }
      }),
    )
  }

  async function run(mode: 'chat' | 'search') {
    const text = prompt.trim()
    if (!text || busy) return
    if (mode === 'chat' && configured !== true) {
      setNotice('Defina DEEPSEEK_API_KEY no arquivo .env e reinicie o servidor.')
      return
    }

    const userId = crypto.randomUUID()
    const assistantId = crypto.randomUUID()
    const history = messages
      .filter((message) => message.content.trim() && !message.error)
      .map((message) => ({ role: message.role, content: message.content }))
    const modelfile = parseModelfile(raw)
    const userTurn: ChatTurn = {
      ...EMPTY_TURN,
      id: userId,
      role: 'user',
      content: text,
      query: '',
    }
    const assistantTurn: ChatTurn = {
      ...EMPTY_TURN,
      id: assistantId,
      role: 'assistant',
      content: '',
      query: text,
      pending: true,
      status: mode === 'search' ? 'Começando a Deep Search' : 'Chamando a DeepSeek',
    }

    setReader(null)
    setPrompt('')
    setNotice('')
    setBusy(true)
    setMessages((current) => [...current, userTurn, assistantTurn])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const onEvent = (event: StreamEvent) => applyEvent(assistantId, event)
      if (mode === 'search') {
        await streamDeepSearch(
          {
            query: text,
            model,
            system: modelfile.system,
            temperature: modelfile.temperature,
          },
          controller.signal,
          onEvent,
        )
      } else {
        await streamChat(
          {
            model,
            system: modelfile.system,
            temperature: modelfile.temperature,
            messages: [...history, { role: 'user', content: text }],
          },
          controller.signal,
          onEvent,
        )
      }
      applyEvent(assistantId, { type: 'done' })
    } catch (error) {
      if (controller.signal.aborted) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  pending: false,
                  status: '',
                  content: message.content || 'Interrompido.',
                }
              : message,
          ),
        )
      } else {
        const message = error instanceof Error ? error.message : 'A requisição falhou.'
        applyEvent(assistantId, { type: 'error', message })
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
  }

  async function saveModelfile() {
    setSavingModelfile(true)
    setNotice('')
    try {
      const file = await putModelfile(raw)
      setRaw(file.raw)
      setNotice('Modelfile salvo.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível salvar o modelfile.')
    } finally {
      setSavingModelfile(false)
    }
  }

  async function reloadModelfile() {
    setNotice('')
    try {
      const file = await getModelfile()
      setRaw(file.raw)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível recarregar o modelfile.')
    }
  }

  async function readUrl(url: string) {
    setReading(true)
    setReadError('')
    setDraft(null)
    try {
      setDraft(await fetchPage(url))
    } catch (error) {
      setReadError(error instanceof Error ? error.message : 'Não foi possível ler a página.')
    } finally {
      setReading(false)
    }
  }

  async function savePage() {
    if (!draft) return
    try {
      await postLibraryItem({
        kind: 'page',
        title: draft.title,
        url: draft.url,
        content: draft.content,
        query: '',
        sources: [{ title: draft.title, url: draft.url, snippet: draft.excerpt }],
      })
      setDraft(null)
      setNotice('Página guardada.')
      await refreshLibrary()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível guardar a página.')
    }
  }

  async function saveReport(message: ChatTurn) {
    try {
      await postLibraryItem({
        kind: 'report',
        title: message.query.slice(0, 80) || 'Resposta',
        url: '',
        content: message.content,
        query: message.query,
        sources: message.sources,
      })
      setNotice('Resposta guardada.')
      await refreshLibrary()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível guardar a resposta.')
    }
  }

  async function saveSource(message: ChatTurn, source: Source) {
    try {
      await postLibraryItem({
        kind: 'page',
        title: source.title || source.url,
        url: source.url,
        content: source.content || source.snippet || source.url,
        query: message.query,
        sources: [source],
      })
      setNotice('Página guardada.')
      await refreshLibrary()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível guardar a página.')
    }
  }

  async function deleteItem(id: string) {
    try {
      await removeLibraryItem(id)
      if (reader?.id === id) setReader(null)
      await refreshLibrary()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível apagar o item.')
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>Playground</p>
          <h1>DeepSeek</h1>
        </div>
        <div className={styles.headerTools}>
          <label>
            Modelo
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              <option value="deepseek-chat">deepseek-chat</option>
              <option value="deepseek-reasoner">deepseek-reasoner</option>
            </select>
          </label>
          <span className={configured === false ? styles.warn : styles.ok}>
            {configured === null ? 'Checando API' : configured ? 'API pronta' : 'Sem chave'}
          </span>
        </div>
      </header>

      {configured === false ? (
        <p className={styles.banner}>
          A conversa precisa de <code>DEEPSEEK_API_KEY</code> no arquivo <code>.env</code>. A leitura
          de páginas e a busca web continuam disponíveis.
        </p>
      ) : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}

      <div className={styles.shell}>
        <Sidebar
          raw={raw}
          onRawChange={setRaw}
          onSaveModelfile={() => void saveModelfile()}
          onReloadModelfile={() => void reloadModelfile()}
          savingModelfile={savingModelfile}
          items={items}
          activeId={reader?.id ?? null}
          onOpen={setReader}
          onDelete={(id) => void deleteItem(id)}
          onReadPage={(url) => void readUrl(url)}
          onSavePage={() => void savePage()}
          reading={reading}
          draft={draft}
          readError={readError}
        />

        <main className={styles.main}>
          <Thread
            messages={messages}
            reader={reader}
            onCloseReader={() => setReader(null)}
            onSaveReport={(message) => void saveReport(message)}
            onSaveSource={(message, source) => void saveSource(message, source)}
          />

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault()
              void run('chat')
            }}
          >
            <label className={styles.sr} htmlFor="prompt">
              Mensagem
            </label>
            <textarea
              id="prompt"
              value={prompt}
              placeholder="Peça código, uma explicação ou uma pesquisa na web"
              rows={3}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void run('chat')
                }
              }}
            />
            <div className={styles.composerBar}>
            <p className={styles.hint}>Enter envia. Shift+Enter quebra a linha.</p>
            <div className={styles.composerActions}>
              {busy ? (
                <button type="button" className={styles.ghost} onClick={stop}>
                  Parar
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={!prompt.trim()}
                  onClick={() => void run('search')}
                >
                  Deep Search
                </button>
              )}
              <button type="submit" className={styles.solid} disabled={busy || !prompt.trim()}>
                {busy ? 'Respondendo' : 'Enviar'}
              </button>
            </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
