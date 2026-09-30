import { useState } from 'react'
import { getDownloadUrl } from '../api/unsplash'
import type { UnsplashPhoto } from '../types/unsplash'
import { copyText } from '../utils/clipboard'
import {
  buildMarkdownCredit,
  buildRelatedDataExport,
  triggerBrowserDownload,
} from '../utils/photoTools'
import styles from './ImageTools.module.css'

type ToolFeedback =
  | ''
  | 'credit'
  | 'json'
  | 'download'
  | 'download-error'
  | 'copy-error'

interface ImageToolsProps {
  photo: UnsplashPhoto
  relatedIds: string[]
  onSearchPhotographer: (query: string) => void
}

export function ImageTools({
  photo,
  relatedIds,
  onSearchPhotographer,
}: ImageToolsProps) {
  const [feedback, setFeedback] = useState<ToolFeedback>('')
  const [downloading, setDownloading] = useState(false)

  function flash(next: ToolFeedback) {
    setFeedback(next)
    window.setTimeout(() => setFeedback(''), 2000)
  }

  async function handleCopyCredit() {
    const ok = await copyText(buildMarkdownCredit(photo))
    flash(ok ? 'credit' : 'copy-error')
  }

  async function handleCopyJson() {
    const ok = await copyText(buildRelatedDataExport(photo, relatedIds))
    flash(ok ? 'json' : 'copy-error')
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const url = await getDownloadUrl(photo)
      triggerBrowserDownload(url, `unsplash-${photo.id}.jpg`)
      flash('download')
    } catch {
      flash('download-error')
    } finally {
      setDownloading(false)
    }
  }

  function handleSearchPhotographer() {
    const query = photo.user.name?.trim() || photo.user.username
    if (query) onSearchPhotographer(query)
  }

  const statusMessage =
    feedback === 'credit'
      ? 'Crédito Markdown copiado.'
      : feedback === 'json'
        ? 'JSON dos dados relacionados copiado.'
        : feedback === 'download'
          ? 'Download iniciado.'
          : feedback === 'download-error'
            ? 'Falha ao baixar a imagem.'
            : feedback === 'copy-error'
              ? 'Não foi possível copiar.'
              : ''

  return (
    <section className={styles.tools} aria-label="Ferramentas">
      <h3 className={styles.title}>Ferramentas</h3>
      <p className={styles.subtitle}>
        Ações rápidas com esta imagem e seus dados relacionados
      </p>

      <div className={styles.grid}>
        <button
          type="button"
          className={styles.tool}
          onClick={() => void handleDownload()}
          disabled={downloading}
        >
          <span className={styles.toolName}>
            {downloading ? 'Preparando…' : 'Baixar imagem'}
          </span>
          <span className={styles.toolHint}>Arquivo em alta resolução</span>
        </button>

        <button
          type="button"
          className={styles.tool}
          onClick={() => void handleCopyCredit()}
        >
          <span className={styles.toolName}>Copiar crédito</span>
          <span className={styles.toolHint}>Markdown com atribuição</span>
        </button>

        <button
          type="button"
          className={styles.tool}
          onClick={() => void handleCopyJson()}
        >
          <span className={styles.toolName}>Exportar dados</span>
          <span className={styles.toolHint}>JSON com metadados relacionados</span>
        </button>

        <button
          type="button"
          className={styles.tool}
          onClick={handleSearchPhotographer}
          disabled={!photo.user.name && !photo.user.username}
        >
          <span className={styles.toolName}>Buscar fotógrafo</span>
          <span className={styles.toolHint}>
            Mais fotos de {photo.user.name || photo.user.username || '—'}
          </span>
        </button>
      </div>

      {statusMessage ? (
        <p
          className={
            feedback === 'download-error' || feedback === 'copy-error'
              ? styles.statusError
              : styles.status
          }
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}
    </section>
  )
}
