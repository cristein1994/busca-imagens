import type { GalleryItem } from '../types/generator'

interface GalleryProps {
  items: GalleryItem[]
  onSelect: (item: GalleryItem) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function Gallery({ items, onSelect, onRemove, onClear }: GalleryProps) {
  if (items.length === 0) {
    return (
      <div className="panel result-stage">
        <div className="placeholder">
          <strong>Galeria vazia</strong>
          Gere imagens e elas ficam salvas aqui (localStorage).
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Galeria ({items.length})</h2>
        <button type="button" className="btn btn-ghost" onClick={onClear}>
          Limpar
        </button>
      </div>
      <div className="gallery-grid">
        {items.map((item) => (
          <article key={item.id} className="gallery-card">
            <button
              type="button"
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
              }}
              onClick={() => onSelect(item)}
            >
              <img src={item.url} alt={item.prompt.slice(0, 80)} loading="lazy" />
              <div className="gallery-meta">
                {item.style} · {item.intensity} · seed {item.seed}
              </div>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{
                width: 'calc(100% - 0.8rem)',
                margin: '0 0.4rem 0.4rem',
                padding: '0.4rem',
                fontSize: '0.8rem',
              }}
              onClick={() => onRemove(item.id)}
            >
              Remover
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
