import type { DorkFields, MediaFilter, SearchMode } from '../../shared/contracts.ts'
import { buildDork } from '../../shared/dork.ts'

type Props = {
  query: string
  mode: SearchMode
  media: MediaFilter
  nsfw: boolean
  adultOk: boolean
  dork: DorkFields
  loading: boolean
  onQuery: (value: string) => void
  onMode: (value: SearchMode) => void
  onMedia: (value: MediaFilter) => void
  onNsfw: (value: boolean) => void
  onAdult: (value: boolean) => void
  onDork: (patch: Partial<DorkFields>) => void
  onSubmit: () => void
}

const FILETYPES = ['', 'jpg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mkv']

export function QueryDeck(props: Props) {
  const preview = buildDork({
    query: props.query,
    mode: props.mode,
    media: props.media,
    dork: props.dork,
  })

  return (
    <form
      className="deck"
      onSubmit={(event) => {
        event.preventDefault()
        props.onSubmit()
      }}
    >
      <div className="deck-kicker">
        <span>Consulta</span>
        <span>{props.mode === 'metadata' ? 'metadados' : 'conteúdo'}</span>
      </div>
      <label className="query-label" htmlFor="q">
        O que procurar
      </label>
      <textarea
        id="q"
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
        placeholder={props.mode === 'metadata'
          ? 'farol, entrevista, nome de arquivo, câmera…'
          : 'descreva o que aparece na foto ou no vídeo'}
        rows={3}
      />

      <div className="segment" role="radiogroup" aria-label="Modo da busca">
        <button type="button" aria-pressed={props.mode === 'metadata'} onClick={() => props.onMode('metadata')}>
          Metadados
        </button>
        <button type="button" aria-pressed={props.mode === 'content'} onClick={() => props.onMode('content')}>
          Conteúdo
        </button>
      </div>
      <p className="hint">
        {props.mode === 'metadata'
          ? 'Monta filetype, título, URL, autor, câmera, resolução e datas. Serve para achar o arquivo pelo que está em volta dele.'
          : 'Manda o texto como descrição: título, legenda, transcrição e nome de arquivo. Os motores de vídeo e imagem usam a vertical certa.'}
      </p>

      <div className="segment" role="radiogroup" aria-label="Tipo de mídia">
        {([
          ['both', 'Fotos e vídeos'],
          ['image', 'Fotos'],
          ['video', 'Vídeos'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={props.media === value} onClick={() => props.onMedia(value)}>
            {label}
          </button>
        ))}
      </div>

      <label className="check nsfw">
        <input
          type="checkbox"
          checked={props.nsfw}
          onChange={(event) => props.onNsfw(event.target.checked)}
        />
        <span>Incluir adulto (18+)</span>
      </label>
      {props.nsfw && !props.adultOk && (
        <div className="gate">
          <p>Confirme que você tem 18 anos ou mais para buscar conteúdo adulto.</p>
          <div className="row">
            <button type="button" className="solid" onClick={() => props.onAdult(true)}>Tenho 18+</button>
            <button type="button" onClick={() => props.onNsfw(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <details className="dorks">
        <summary>Dorks e metadados</summary>
        <div className="fields">
          <Field label="Frase exata" value={props.dork.exact} onChange={(exact) => props.onDork({ exact })} />
          <label>
            Tipo de arquivo
            <select value={props.dork.filetype} onChange={(event) => props.onDork({ filetype: event.target.value })}>
              {FILETYPES.map((type) => (
                <option key={type || 'any'} value={type}>{type || (props.mode === 'metadata' ? 'grupo automático' : 'qualquer')}</option>
              ))}
            </select>
          </label>
          <Field label="site:" value={props.dork.site} onChange={(site) => props.onDork({ site })} placeholder="archive.org" />
          <Field label="intitle:" value={props.dork.intitle} onChange={(intitle) => props.onDork({ intitle })} />
          <Field label="inurl:" value={props.dork.inurl} onChange={(inurl) => props.onDork({ inurl })} />
          <Field label="Autor / crédito" value={props.dork.author} onChange={(author) => props.onDork({ author })} />
          <Field label="Câmera ou modelo" value={props.dork.camera} onChange={(camera) => props.onDork({ camera })} />
          <Field label="Resolução" value={props.dork.resolution} onChange={(resolution) => props.onDork({ resolution })} placeholder="1920x1080" />
          <Field label="Codec" value={props.dork.codec} onChange={(codec) => props.onDork({ codec })} placeholder="h264" />
          <Field label="Depois de" value={props.dork.after} onChange={(after) => props.onDork({ after })} placeholder="2020-01-01" />
          <Field label="Antes de" value={props.dork.before} onChange={(before) => props.onDork({ before })} placeholder="2024-12-31" />
          <Field label="Excluir palavras" value={props.dork.exclude} onChange={(exclude) => props.onDork({ exclude })} />
        </div>
      </details>

      <div className="dork-preview">
        <span>Dork</span>
        <code>{preview || 'vazio'}</code>
      </div>

      <button className="solid search" type="submit" disabled={props.loading || (props.nsfw && !props.adultOk)}>
        {props.loading ? 'Varrendo motores…' : 'Buscar'}
      </button>
    </form>
  )
}

function Field(props: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      {props.label}
      <input
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  )
}
