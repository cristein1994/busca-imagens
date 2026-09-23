import type { MediaHit } from '../../shared/contracts.ts'

type Props = {
  hits: MediaHit[]
  query: string
  filesOnly: boolean
  onFilesOnly: (value: boolean) => void
  onOpen: (hit: MediaHit) => void
}

export function ResultWall(props: Props) {
  const hits = props.filesOnly ? props.hits.filter((hit) => hit.mediaUrl || hit.embedUrl) : props.hits
  return (
    <section className="wall" aria-label="Resultados">
      <header className="wall-head">
        <div>
          <h2>Resultados</h2>
          <p>{hits.length} itens{props.query ? ` para “${props.query}”` : ''}</p>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={props.filesOnly}
            onChange={(event) => props.onFilesOnly(event.target.checked)}
          />
          <span>Só o que dá para ver aqui</span>
        </label>
      </header>
      {hits.length === 0 ? (
        <p className="empty">Nenhum item com esse recorte. Abra a busca num motor da lista ou solte um filtro.</p>
      ) : (
        <ul className="grid">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button type="button" className="card" onClick={() => props.onOpen(hit)}>
                <span className={`frame ${hit.kind}`}>
                  {hit.thumbUrl ? (
                    <img src={hit.thumbUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="placeholder">{hit.kind === 'video' ? 'vídeo' : hit.kind === 'image' ? 'foto' : 'página'}</span>
                  )}
                </span>
                <span className="card-copy">
                  <strong>{hit.title}</strong>
                  <em>{hit.engineName} · {hit.network === 'onion' ? 'onion' : 'surface'} · {hit.kind}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
