import { useState } from 'react'
import type { LibraryItem, PageDraft } from '../types.ts'
import styles from '../App.module.css'

type Props = {
  raw: string
  onRawChange: (value: string) => void
  onSaveModelfile: () => void
  onReloadModelfile: () => void
  savingModelfile: boolean
  items: LibraryItem[]
  activeId: string | null
  onOpen: (item: LibraryItem) => void
  onDelete: (id: string) => void
  onReadPage: (url: string) => void
  onSavePage: () => void
  reading: boolean
  draft: PageDraft | null
  readError: string
}

export function Sidebar({
  raw,
  onRawChange,
  onSaveModelfile,
  onReloadModelfile,
  savingModelfile,
  items,
  activeId,
  onOpen,
  onDelete,
  onReadPage,
  onSavePage,
  reading,
  draft,
  readError,
}: Props) {
  const [url, setUrl] = useState('https://')

  return (
    <aside className={styles.sidebar}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Modelfile</h2>
          <div className={styles.row}>
            <button type="button" className={styles.ghost} onClick={onReloadModelfile}>
              Recarregar
            </button>
            <button
              type="button"
              className={styles.solid}
              onClick={onSaveModelfile}
              disabled={savingModelfile || !raw.trim()}
            >
              {savingModelfile ? 'Salvando' : 'Salvar'}
            </button>
          </div>
        </div>
        <textarea
          className={styles.modelfile}
          value={raw}
          spellCheck={false}
          aria-label="Modelfile"
          onChange={(event) => onRawChange(event.target.value)}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Guarda web</h2>
          <span className={styles.count}>{items.length}</span>
        </div>
        <form
          className={styles.urlForm}
          onSubmit={(event) => {
            event.preventDefault()
            onReadPage(url)
          }}
        >
          <label htmlFor="page-url">Abrir página</label>
          <div className={styles.row}>
            <input
              id="page-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              inputMode="url"
            />
            <button type="submit" className={styles.solid} disabled={reading}>
              {reading ? 'Lendo' : 'Ler'}
            </button>
          </div>
        </form>
        {readError ? <p className={styles.formError}>{readError}</p> : null}
        {draft ? (
          <article className={styles.draft}>
            <strong>{draft.title}</strong>
            <p>{draft.excerpt}</p>
            <button type="button" className={styles.solid} onClick={onSavePage}>
              Guardar página
            </button>
          </article>
        ) : null}
        {items.length === 0 ? (
          <p className={styles.empty}>Nada guardado ainda.</p>
        ) : (
          <ul className={styles.library}>
            {items.map((item) => (
              <li key={item.id} className={item.id === activeId ? styles.activeItem : undefined}>
                <button type="button" className={styles.libraryMain} onClick={() => onOpen(item)}>
                  <span className={styles.kind}>{item.kind === 'page' ? 'Página' : 'Resposta'}</span>
                  <span className={styles.itemTitle}>{item.title}</span>
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Apagar ${item.title}`}
                  onClick={() => onDelete(item.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
