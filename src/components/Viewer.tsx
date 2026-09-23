import { useEffect, useState } from 'react'
import type { InspectResponse, MediaHit } from '../../shared/contracts.ts'
import { embedFor, mediaKindFromUrl } from '../../shared/media.ts'
import { downloadSrc, formatBytes, inspectMedia, previewSrc } from '../api/client.ts'

type Props = {
  hit: MediaHit
  onClose: () => void
}

export function Viewer(props: Props) {
  const { hit, onClose } = props
  const [info, setInfo] = useState<InspectResponse | null>(null)
  const [error, setError] = useState('')
  const candidate = hit.mediaUrl ?? hit.pageUrl
  const embed = hit.embedUrl ?? embedFor(hit.pageUrl) ?? embedFor(hit.mediaUrl)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancel = false
    void inspectMedia(candidate)
      .then((next) => {
        if (!cancel) setInfo(next)
      })
      .catch((reason: unknown) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : 'Falha ao inspecionar.')
      })
    return () => {
      cancel = true
    }
  }, [candidate])

  const fileUrl = info?.downloadable ? info.url : info ? null : hit.mediaUrl
  const kind = info?.kind ?? mediaKindFromUrl(fileUrl ?? '') ?? (embed ? 'video' : hit.kind)

  return (
    <div className="viewer-back" role="presentation" onClick={onClose}>
      <div
        className="viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">{hit.engineName}</p>
            <h2 id="viewer-title">{hit.title}</h2>
          </div>
          <button type="button" className="solid" onClick={onClose}>Fechar</button>
        </header>
        <div className="stage">
          {fileUrl && kind === 'image' ? (
            <img src={previewSrc(fileUrl)} alt={hit.title} />
          ) : null}
          {fileUrl && kind === 'video' ? (
            <video src={previewSrc(fileUrl)} controls playsInline poster={hit.thumbUrl ?? undefined} />
          ) : null}
          {!fileUrl && embed ? (
            <iframe
              src={embed}
              title={hit.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
          {!fileUrl && !embed ? (
            <div className="stage-fallback">
              {hit.thumbUrl ? <img src={hit.thumbUrl} alt="" /> : <p>Sem prévia embutida.</p>}
            </div>
          ) : null}
        </div>
        <footer>
          <p>{error || info?.detail || 'Lendo o tipo do arquivo…'}</p>
          <p className="muted">
            {info?.contentType ?? 'tipo ainda não lido'}
            {info?.bytes !== null && info?.bytes !== undefined ? ` · ${formatBytes(info.bytes)}` : ''}
          </p>
          {hit.snippet ? <p className="snippet">{hit.snippet}</p> : null}
          <div className="row">
            {info?.downloadable && fileUrl ? (
              <a className="solid" href={downloadSrc(fileUrl)}>Baixar arquivo</a>
            ) : (
              <span className="muted">Download só quando a URL é o arquivo de imagem ou vídeo.</span>
            )}
            <a href={hit.pageUrl} target="_blank" rel="noreferrer">Abrir origem</a>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(fileUrl ?? hit.pageUrl)
              }}
            >
              Copiar URL
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
