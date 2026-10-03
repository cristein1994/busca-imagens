import type { GpProfile } from '../types/gp'
import { positionLabel } from '../lib/filter'
import styles from './ProfileCard.module.css'

interface ProfileCardProps {
  profile: GpProfile
  favorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
}

export function ProfileCard({
  profile,
  favorite,
  onOpen,
  onToggleFavorite,
}: ProfileCardProps) {
  const initials = profile.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <article className={styles.card}>
      <button type="button" className={styles.media} onClick={onOpen} aria-label={profile.name}>
        <span className={styles.initials}>{initials}</span>
        <span className={styles.size}>{profile.sizeCm} cm</span>
      </button>
      <div className={styles.body}>
        <div className={styles.top}>
          <h3>{profile.name}</h3>
          <button
            type="button"
            className={favorite ? styles.favOn : styles.fav}
            onClick={onToggleFavorite}
            aria-label={favorite ? 'Remover favorito' : 'Favoritar'}
          >
            {favorite ? '★' : '☆'}
          </button>
        </div>
        <p className={styles.meta}>
          {profile.age}a · {positionLabel(profile.position)} · {profile.city}
        </p>
        {profile.body ? <p className={styles.bodyline}>{profile.body}</p> : null}
        <div className={styles.tags}>
          {profile.tags.slice(0, 3).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <button type="button" className={styles.open} onClick={onOpen}>
          Ver / chamar
        </button>
      </div>
    </article>
  )
}
