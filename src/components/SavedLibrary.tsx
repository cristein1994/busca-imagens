import { useRef } from 'react'
import type { SavedPreset } from '../types/studio'
import styles from './SavedLibrary.module.css'

interface SavedLibraryProps {
  presets: SavedPreset[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onImport: (preset: SavedPreset) => void
}

export function SavedLibrary({ presets, onLoad, onDelete, onImport }: SavedLibraryProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as SavedPreset | { character: SavedPreset['character']; instructions: SavedPreset['instructions']; prompt?: string }
      if ('character' in data && 'instructions' in data) {
        const preset: SavedPreset = {
          id: 'id' in data && typeof data.id === 'string' ? data.id : `import_${Date.now()}`,
          name:
            'name' in data && typeof data.name === 'string'
              ? data.name
              : file.name.replace(/\.json$/i, ''),
          createdAt:
            'createdAt' in data && typeof data.createdAt === 'string'
              ? data.createdAt
              : new Date().toISOString(),
          character: data.character,
          instructions: data.instructions,
          task:
            'task' in data && data.task
              ? data.task
              : { goal: '', context: '', extraNotes: '', length: 'medio', creativity: 55 },
        }
        onImport(preset)
      }
    } catch {
      window.alert('Arquivo JSON inválido.')
    }
  }

  return (
    <section className={styles.wrap} aria-labelledby="library-title">
      <div className={styles.head}>
        <div>
          <h2 id="library-title">Biblioteca local</h2>
          <p>Presets salvos neste navegador.</p>
        </div>
        <div className={styles.tools}>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Importar JSON
          </button>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {presets.length === 0 ? (
        <p className={styles.empty}>Nenhum preset salvo ainda. Monte um prompt e clique em Salvar.</p>
      ) : (
        <ul className={styles.list}>
          {presets.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <span>
                  {p.character.name || 'Sem nome'} ·{' '}
                  {new Date(p.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className={styles.actions}>
                <button type="button" onClick={() => onLoad(p.id)}>
                  Carregar
                </button>
                <button type="button" className={styles.delete} onClick={() => onDelete(p.id)}>
                  Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
