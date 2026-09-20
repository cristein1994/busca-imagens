import { useEffect, useCallback, useState } from 'react'
import type { UnsplashPhoto } from '../types/unsplash'
import styles from './Lightbox.module.css'

interface LightboxProps {
  photo: UnsplashPhoto
  onClose: () => void
}

export function Lightbox({ photo, onClose }: LightboxProps) {
  const [copied, setCopied] = useState(false)
  const alt = photo.alt_description || photo.description || 'Imagem do Unsplash'
  const imageUrl = photo.urls.regular
  const originalUrl = photo.links.html

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prev
    }
  }, [handleKeyDown])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(imageUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = imageUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Visualização da imagem"
      onClick={onClose}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        <div className={styles.imageWrap}>
          <img
            className={styles.image}
            src={imageUrl}
            alt={alt}
          />
        </div>

        <div className={styles.footer}>
          <p className={styles.credit}>
            {photo.user.name ? (
              <>
                Foto de{' '}
                <a
                  href={`${photo.user.links.html}?utm_source=busca_imagens&utm_medium=referral`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {photo.user.name}
                </a>
                {' '}no{' '}
                <a
                  href="https://unsplash.com/?utm_source=busca_imagens&utm_medium=referral"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Unsplash
                </a>
              </>
            ) : (
              'Crédito indisponível'
            )}
          </p>

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={handleCopy}>
              {copied ? 'URL copiada!' : 'Copiar URL'}
            </button>
            <a
              className={styles.primary}
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir original
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
