import { useEffect, useState } from 'react'
import type { Chat, PostPreview } from '../../shared/chat'
import { loadChat } from '../api/client'
import { formatExact, formatWhen, initial, languageLabel, sourceLabel, avatarHue } from '../format'
import styles from './DetailPanel.module.css'

interface DetailPanelProps {
  username: string
  fallback: Chat | null
  onClose: () => void
}

export function DetailPanel({ username, fallback, onClose }: DetailPanelProps) {
  const [chat, setChat] = useState<Chat | null>(fallback)
  const [posts, setPosts] = useState<PostPreview[]>([])
  const [postsNote, setPostsNote] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [seenUser, setSeenUser] = useState(username)

  if (seenUser !== username) {
    setSeenUser(username)
    setStatus('loading')
    setError('')
    setChat(fallback)
    setPosts([])
    setPostsNote(null)
    setCopied('')
  }

  useEffect(() => {
    const controller = new AbortController()

    loadChat(username, controller.signal)
      .then((data) => {
        setChat(data.chat)
        setPosts(data.posts)
        setPostsNote(data.postsNote)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Could not open that chat.')
      })

    return () => controller.abort()
  }, [username])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
    } catch {
      setCopied('Copy failed')
    }
  }

  const shown = chat ?? fallback
  const hue = avatarHue(username)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.toolbar}>
          <p className={styles.kicker}>Public chat</p>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close details">
            Close
          </button>
        </div>

        {!shown && status === 'error' && <p className={styles.error}>{error}</p>}

        {shown && (
          <>
            <div className={styles.hero}>
              <span className={styles.avatar} style={{ background: `hsl(${hue} 42% 32%)` }}>
                {shown.photo ? <img src={shown.photo} alt="" /> : initial(shown.title)}
              </span>
              <div>
                <h2 id="chat-title" className={styles.title}>
                  {shown.title}
                  {shown.verified && <span className={styles.verified}> Verified</span>}
                </h2>
                <p className={styles.handle}>@{shown.username}</p>
              </div>
            </div>

            <dl className={styles.stats}>
              <div>
                <dt>{shown.type === 'group' ? 'Members' : 'Subscribers'}</dt>
                <dd>{formatExact(shown.members)}</dd>
              </div>
              <div>
                <dt>Online</dt>
                <dd>{shown.online == null ? '—' : formatExact(shown.online)}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{shown.type === 'group' ? 'Group' : 'Channel'}</dd>
              </div>
              <div>
                <dt>Topic</dt>
                <dd>{shown.category}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{languageLabel(shown.language)}</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>{sourceLabel(shown.source, shown.live || status === 'ready')}</dd>
              </div>
            </dl>

            {shown.description && <p className={styles.description}>{shown.description}</p>}

            <div className={styles.actions}>
              <a className={styles.primary} href={shown.link} target="_blank" rel="noopener noreferrer">
                Open in Telegram
              </a>
              <button type="button" onClick={() => copy(shown.link, 'Link copied')}>
                Copy link
              </button>
              <button type="button" onClick={() => copy(`@${shown.username}`, 'Username copied')}>
                Copy username
              </button>
            </div>
            {copied && <p className={styles.copied}>{copied}</p>}
            {status === 'loading' && <p className={styles.note}>Refreshing the public page…</p>}
            {status === 'error' && <p className={styles.error}>{error}</p>}

            <section className={styles.posts} aria-label="Public posts">
              <h3>Public preview</h3>
              {posts.length === 0 && status !== 'loading' && <p className={styles.note}>{postsNote}</p>}
              <ul>
                {posts.map((post) => (
                  <li key={post.id}>
                    <a href={post.link} target="_blank" rel="noopener noreferrer">
                      <time dateTime={post.date ?? undefined}>{formatWhen(post.date)}</time>
                      <span>{post.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </aside>
    </div>
  )
}
