import { downloadBlobUrl } from '../lib/pollinations'

interface ResultStageProps {
  imageUrl: string | null
  loading: boolean
  error: string
  prompt: string
  seed: number | null
  onSave: () => void
  onVary: () => void
}

export function ResultStage({
  imageUrl,
  loading,
  error,
  prompt,
  seed,
  onSave,
  onVary,
}: ResultStageProps) {
  return (
    <section className="panel">
      <h2>Resultado</h2>
      <div className="result-stage">
        {loading && (
          <div className="placeholder">
            <div className="spinner" />
            <strong>Gerando…</strong>
            NSFW livre via Pollinations (safe=false)
          </div>
        )}
        {!loading && !imageUrl && (
          <div className="placeholder">
            <strong>Pronto para criar</strong>
            Monte o personagem, escolha NSFW e gere — 100% grátis.
          </div>
        )}
        {!loading && imageUrl && (
          <img src={imageUrl} alt={prompt.slice(0, 120)} />
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      {imageUrl && !loading && (
        <>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                downloadBlobUrl(imageUrl, `soulforge-${seed ?? 'img'}.png`)
              }
            >
              Download
            </button>
            <button type="button" className="btn btn-ghost" onClick={onSave}>
              Salvar na galeria
            </button>
            <button type="button" className="btn btn-ghost" onClick={onVary}>
              Variar seed
            </button>
          </div>
          <div className="prompt-preview" style={{ marginTop: '0.85rem' }}>
            {seed != null ? `seed ${seed} · ` : ''}
            {prompt}
          </div>
        </>
      )}
    </section>
  )
}
