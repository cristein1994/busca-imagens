import { useState } from 'react'
import type { InspectResponse } from '../../shared/contracts.ts'
import { downloadSrc, formatBytes, inspectMedia } from '../api/client.ts'

type Props = {
  onOpen: (url: string) => void
}

export function DownloadDock(props: Props) {
  const [url, setUrl] = useState('')
  const [info, setInfo] = useState<InspectResponse | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function look() {
    const target = url.trim()
    if (!target) return
    setBusy(true)
    setError('')
    setInfo(null)
    try {
      setInfo(await inspectMedia(target))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao ler a URL.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="dock" aria-label="Baixar URL de mídia">
      <div>
        <h2>URL de mídia</h2>
        <p>Cole o link direto. Se for imagem ou vídeo, o mesmo app mostra e baixa.</p>
      </div>
      <form
        className="dock-form"
        onSubmit={(event) => {
          event.preventDefault()
          void look()
        }}
      >
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…/arquivo.jpg ou .mp4"
          inputMode="url"
          aria-label="URL de mídia"
        />
        <button type="submit" disabled={busy}>{busy ? 'Lendo…' : 'Inspecionar'}</button>
        <button type="button" onClick={() => props.onOpen(url.trim())} disabled={!url.trim()}>
          Abrir no visor
        </button>
        {info?.downloadable ? (
          <a className="solid" href={downloadSrc(info.url)}>Baixar</a>
        ) : null}
      </form>
      {error ? <p className="warn">{error}</p> : null}
      {info ? (
        <p className="dock-note">
          {info.detail}
          {info.contentType ? ` · ${info.contentType}` : ''}
          {info.bytes !== null ? ` · ${formatBytes(info.bytes)}` : ''}
        </p>
      ) : null}
    </section>
  )
}
