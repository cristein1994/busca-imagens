import type { UnsplashPhoto } from '../types/unsplash'
import styles from './ImageCard.module.css'

interface ImageCardProps {
  photo: UnsplashPhoto
  onClick: (photo: UnsplashPhoto) => void
}

export function ImageCard({ photo, onClick }: ImageCardProps) {
  const alt = photo.alt_description || photo.description || 'Imagem do Unsplash'

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onClick(photo)}
      aria-label={`Abrir imagem: ${alt}`}
    >
      <img
        className={styles.image}
        src={photo.urls.small}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
      <span className={styles.credit}>{photo.user.name}</span>
    </button>
  )
}
