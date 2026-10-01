import { useState } from 'react'
import { copyToClipboard, downloadText, exportBundle } from '../lib/storage'
import type { Character, Instructions } from '../types/studio'
import styles from './PromptPreview.module.css'

interface PromptPreviewProps {
  prompt: string
  mode: 'completo' | 'compacto'
  onModeChange: (mode: 'completo' | 'compacto') => void
  character: Character
  instructions: Instructions
  onSave: () => void
  onReset: () => void
}

export function PromptPreview({
  prompt,
  mode,
  onModeChange,
  character,
  instructions,
  onSave,
  onReset,
}: PromptPreviewProps) {
  const [copied, setCopied] = useState(false)
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0
  const charCount = prompt.length

  const handleCopy = async () => {
    const ok = await copyToClipboard(prompt)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  const handleDownloadMd = () => {
    const name = (character.name || 'prompt').toLowerCase().replace(/\s+/g, '-')
    downloadText(`${name}-system-prompt.md`, prompt, 'text/markdown')
  }

  const handleDownloadJson = () => {
    const name = (character.name || 'prompt').toLowerCase().replace(/\s+/g, '-')
    downloadText(
      `${name}-bundle.json`,
      exportBundle(character, instructions, prompt),
      'application/json',
    )
  }

  return (
    <aside className={styles.wrap} aria-labelledby="preview-title">
      <header className={styles.head}>
        <div>
          <h2 id="preview-title">Prompt gerado</h2>
          <p>
            {wordCount} palavras · {charCount} caracteres
          </p>
        </div>
        <div className={styles.modes} role="group" aria-label="Modo do prompt">
          <button
            type="button"
            className={mode === 'completo' ? styles.active : undefined}
            onClick={() => onModeChange('completo')}
          >
            Completo
          </button>
          <button
            type="button"
            className={mode === 'compacto' ? styles.active : undefined}
            onClick={() => onModeChange('compacto')}
          >
            Compacto
          </button>
        </div>
      </header>

      <pre className={styles.preview}>{prompt}</pre>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={handleCopy}>
          {copied ? 'Copiado!' : 'Copiar prompt'}
        </button>
        <button type="button" className={styles.ghost} onClick={handleDownloadMd}>
          Baixar .md
        </button>
        <button type="button" className={styles.ghost} onClick={handleDownloadJson}>
          Baixar .json
        </button>
        <button type="button" className={styles.ghost} onClick={onSave}>
          Salvar preset
        </button>
        <button type="button" className={styles.danger} onClick={onReset}>
          Limpar tudo
        </button>
      </div>
    </aside>
  )
}
