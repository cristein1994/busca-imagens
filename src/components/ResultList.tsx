import type { Chat } from '../../shared/chat'
import { avatarHue, formatCount, initial, languageLabel, sourceLabel } from '../format'
import styles from './ResultList.module.css'

interface ResultListProps {
  chats: Chat[]
  selected: string | null
  onSelect: (username: string) => void
}

export function ResultList({ chats, selected, onSelect }: ResultListProps) {
  return (
    <ul className={styles.list}>
      {chats.map((chat) => {
        const hue = avatarHue(chat.username)
        const active = selected?.toLowerCase() === chat.username.toLowerCase()
        return (
          <li key={chat.username.toLowerCase()}>
            <button
              type="button"
              className={active ? `${styles.card} ${styles.active}` : styles.card}
              onClick={() => onSelect(chat.username)}
              aria-pressed={active}
            >
              <span
                className={styles.avatar}
                style={{ background: `hsl(${hue} 42% 32%)` }}
                aria-hidden="true"
              >
                {chat.photo ? (
                  <img
                    src={chat.photo}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.remove()
                    }}
                  />
                ) : null}
                <span>{initial(chat.title)}</span>
              </span>
              <span className={styles.body}>
                <span className={styles.titleRow}>
                  <span className={styles.title}>{chat.title}</span>
                  {chat.verified && <span className={styles.verified}>Verified</span>}
                </span>
                <span className={styles.handle}>@{chat.username}</span>
                <span className={styles.tags}>
                  <span className={chat.type === 'group' ? styles.group : styles.channel}>
                    {chat.type === 'group' ? 'Group' : 'Channel'}
                  </span>
                  <span>{chat.category}</span>
                  <span>{languageLabel(chat.language)}</span>
                  <span>{sourceLabel(chat.source, chat.live)}</span>
                </span>
                {chat.description && <span className={styles.description}>{chat.description}</span>}
              </span>
              <span className={styles.members}>
                <strong>{formatCount(chat.members)}</strong>
                <span>{chat.type === 'group' ? 'members' : 'subscribers'}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
