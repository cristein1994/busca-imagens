import { useState } from 'react'
import { deleteCase, exportCaseMarkdown, updateCaseNotes } from '../lib/cases'
import type { SavedCase } from '../lib/types'

type Props = {
  cases: SavedCase[]
  onChange: () => void
  onOpen: (item: SavedCase) => void
}

export function CaseList({ cases, onChange, onOpen }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  if (!cases.length) {
    return (
      <section className="panel" aria-label="Casos">
        <h2>Casos locais</h2>
        <p className="empty">Nenhum caso guardado neste navegador.</p>
      </section>
    )
  }

  return (
    <section className="panel" aria-label="Casos">
      <h2>Casos locais</h2>
      <div className="cases">
        {cases.map((item) => {
          const notes = drafts[item.id] ?? item.notes
          return (
            <article className="caseItem" key={item.id}>
              <div className="caseHead">
                <strong>{item.title}</strong>
                <span className="caseMeta">
                  {new Date(item.updatedAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="caseMeta" style={{ margin: '0.25rem 0 0' }}>
                {item.snapshot.countryName} · {item.snapshot.kindLabel}
              </p>
              <textarea
                className="caseNotes"
                value={notes}
                placeholder="Notas OSINT…"
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
              />
              <div className="caseActions">
                <button type="button" className="ghostBtn" onClick={() => onOpen(item)}>
                  Reabrir
                </button>
                <button
                  type="button"
                  className="ghostBtn"
                  onClick={() => {
                    updateCaseNotes(item.id, notes)
                    onChange()
                  }}
                >
                  Salvar notas
                </button>
                <button
                  type="button"
                  className="ghostBtn"
                  onClick={() => {
                    const md = exportCaseMarkdown({ ...item, notes })
                    void navigator.clipboard.writeText(md)
                  }}
                >
                  Copiar MD
                </button>
                <button
                  type="button"
                  className="ghostBtn"
                  onClick={() => {
                    deleteCase(item.id)
                    onChange()
                  }}
                >
                  Apagar
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
