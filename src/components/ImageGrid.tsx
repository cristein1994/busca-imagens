import type { UnsplashPhoto } from '../types/unsplash'
import { ImageCard } from './ImageCard'
import styles from './ImageGrid.module.css'

interface ImageGridProps {
  photos: UnsplashPhoto[]
  onSelect: (photo: UnsplashPhoto) => void
}

export function ImageGrid({ photos, onSelect }: ImageGridProps) {
  return (
    <div className={styles.grid} role="list">
      {photos.map((photo) => (
        <div key={photo.id} role="listitem">
          <ImageCard photo={photo} onClick={onSelect} />
        </div>
      ))}
    </div>
  )
}
