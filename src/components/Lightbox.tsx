import { useEffect, useCallback, useState } from 'react'
import { getRelatedPhotoData } from '../api/unsplash'
import type { UnsplashPhoto } from '../types/unsplash'
import { ImageTools } from './ImageTools'
import styles from './Lightbox.module.css'

interface LightboxProps {
  photo: UnsplashPhoto
  onClose: () => void
  onSelectRelated: (photo: UnsplashPhoto) => void
  onSearchTag: (tag: string) => void
  onSearchPhotographer: (query: string) => void
}

function formatLocation(photo: UnsplashPhoto): string | null {
  const loc = photo.location
  if (!loc) return null
  if (loc.name?.trim()) return loc.name.trim()
  const parts = [loc.city, loc.country].filter(
    (part): part is string => Boolean(part?.trim()),
  )
  return parts.length > 0 ? parts.join(', ') : null
}

function formatExif(photo: UnsplashPhoto): string | null {
  const exif = photo.exif
  if (!exif) return null
  const camera = exif.name || [exif.make, exif.model].filter(Boolean).join(' ')
  const parts = [
    camera || null,
    exif.focal_length ? `${exif.focal_length}mm` : null,
    exif.aperture ? `f/${exif.aperture}` : null,
    exif.exposure_time ? `${exif.exposure_time}s` : null,
    exif.iso != null ? `ISO ${exif.iso}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

function formatDate(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCount(value?: number): string | null {
  if (value == null) return null
  return value.toLocaleString('pt-BR')
}

export function Lightbox({
  photo,
  onClose,
  onSelectRelated,
  onSearchTag,
  onSearchPhotographer,
}: LightboxProps) {
  const [copied, setCopied] = useState(false)
  const [details, setDetails] = useState<UnsplashPhoto>(photo)
  const [related, setRelated] = useState<UnsplashPhoto[]>([])
  const [relatedStatus, setRelatedStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [relatedError, setRelatedError] = useState('')

  const alt = details.alt_description || details.description || 'Imagem do Unsplash'
  const imageUrl = details.urls.regular
  const originalUrl = details.links.html
  const location = formatLocation(details)
  const exif = formatExif(details)
  const createdAt = formatDate(details.created_at)
  const tags = (details.tags ?? [])
    .map((tag) => tag.title?.trim())
    .filter((title): title is string => Boolean(title))
    .slice(0, 12)

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

  useEffect(() => {
    let cancelled = false

    getRelatedPhotoData(photo.id)
      .then((data) => {
        if (cancelled) return
        setDetails({ ...photo, ...data.details })
        setRelated(data.related.filter((item) => item.id !== photo.id).slice(0, 8))
        setRelatedStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setRelatedStatus('error')
        setRelatedError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar dados relacionados.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [photo])

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

        <div className={styles.body}>
          <div className={styles.footer}>
            <p className={styles.credit}>
              {details.user.name ? (
                <>
                  Foto de{' '}
                  <a
                    href={`${details.user.links.html}?utm_source=busca_imagens&utm_medium=referral`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {details.user.name}
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

          <ImageTools
            photo={details}
            relatedIds={related.map((item) => item.id)}
            onSearchPhotographer={onSearchPhotographer}
          />

          <section className={styles.related} aria-label="Dados relacionados">
            <h3 className={styles.relatedTitle}>Dados relacionados</h3>

            {(details.description || details.alt_description) && (
              <p className={styles.description}>
                {details.description || details.alt_description}
              </p>
            )}

            <dl className={styles.metaGrid}>
              {details.user.username && (
                <>
                  <dt>Fotógrafo</dt>
                  <dd>
                    @{details.user.username}
                    {details.user.total_photos != null
                      ? ` · ${formatCount(details.user.total_photos)} fotos`
                      : ''}
                  </dd>
                </>
              )}
              {location && (
                <>
                  <dt>Local</dt>
                  <dd>{location}</dd>
                </>
              )}
              {createdAt && (
                <>
                  <dt>Publicada</dt>
                  <dd>{createdAt}</dd>
                </>
              )}
              {exif && (
                <>
                  <dt>Câmera</dt>
                  <dd>{exif}</dd>
                </>
              )}
              {details.color && (
                <>
                  <dt>Cor</dt>
                  <dd className={styles.colorRow}>
                    <span
                      className={styles.swatch}
                      style={{ background: details.color }}
                      aria-hidden="true"
                    />
                    {details.color}
                  </dd>
                </>
              )}
              {(details.width > 0 || details.height > 0) && (
                <>
                  <dt>Dimensões</dt>
                  <dd>
                    {details.width} × {details.height}px
                  </dd>
                </>
              )}
              {formatCount(details.likes) && (
                <>
                  <dt>Curtidas</dt>
                  <dd>{formatCount(details.likes)}</dd>
                </>
              )}
              {formatCount(details.views) && (
                <>
                  <dt>Visualizações</dt>
                  <dd>{formatCount(details.views)}</dd>
                </>
              )}
              {formatCount(details.downloads) && (
                <>
                  <dt>Downloads</dt>
                  <dd>{formatCount(details.downloads)}</dd>
                </>
              )}
            </dl>

            {tags.length > 0 && (
              <div className={styles.tagsBlock}>
                <p className={styles.tagsLabel}>Tags relacionadas</p>
                <div className={styles.tags}>
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={styles.tag}
                      onClick={() => onSearchTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.relatedPhotos}>
              <p className={styles.tagsLabel}>Imagens relacionadas</p>

              {relatedStatus === 'loading' && (
                <p className={styles.relatedHint} role="status">
                  Carregando dados relacionados…
                </p>
              )}

              {relatedStatus === 'error' && (
                <p className={styles.relatedError} role="alert">
                  {relatedError}
                </p>
              )}

              {relatedStatus === 'ready' && related.length === 0 && (
                <p className={styles.relatedHint}>
                  Nenhuma imagem relacionada encontrada.
                </p>
              )}

              {related.length > 0 && (
                <ul className={styles.relatedList}>
                  {related.map((item) => {
                    const itemAlt =
                      item.alt_description || item.description || 'Imagem relacionada'
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={styles.relatedThumb}
                          onClick={() => onSelectRelated(item)}
                          aria-label={`Abrir relacionada: ${itemAlt}`}
                        >
                          <img
                            src={item.urls.thumb}
                            alt={itemAlt}
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
