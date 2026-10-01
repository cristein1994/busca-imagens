import { useRef } from 'react'
import { CharacterPanel } from './components/CharacterPanel'
import { Hero } from './components/Hero'
import { InstructionsPanel } from './components/InstructionsPanel'
import { PresetStrip } from './components/PresetStrip'
import { PromptPreview } from './components/PromptPreview'
import { SavedLibrary } from './components/SavedLibrary'
import { TaskPanel } from './components/TaskPanel'
import { usePromptStudio } from './hooks/usePromptStudio'
import styles from './App.module.css'

export default function App() {
  const studioRef = useRef<HTMLElement>(null)
  const studio = usePromptStudio()

  const scrollToStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSave = () => {
    const name = window.prompt(
      'Nome do preset:',
      studio.character.name
        ? `${studio.character.name} — ${studio.instructions.title || 'custom'}`
        : 'Meu preset',
    )
    if (name === null) return
    studio.saveCurrentAsPreset(name)
  }

  if (!studio.hydrated) {
    return <div className={styles.boot}>Carregando estúdio…</div>
  }

  return (
    <div className={styles.app}>
      <Hero onStart={scrollToStudio} />

      <main className={styles.main}>
        <PresetStrip
          onCharacter={(id) => {
            studio.applyCharacterPreset(id)
            scrollToStudio()
          }}
          onInstructions={(id) => {
            studio.applyInstructionPreset(id)
            scrollToStudio()
          }}
        />

        <section ref={studioRef} className={styles.studio} id="studio" aria-label="Estúdio">
          <div className={styles.editors}>
            <CharacterPanel character={studio.character} onChange={studio.updateCharacter} />
            <InstructionsPanel
              instructions={studio.instructions}
              onChange={studio.updateInstructions}
            />
            <TaskPanel task={studio.task} onChange={studio.updateTask} />
          </div>
          <PromptPreview
            prompt={studio.prompt}
            mode={studio.mode}
            onModeChange={studio.setMode}
            character={studio.character}
            instructions={studio.instructions}
            onSave={handleSave}
            onReset={() => {
              if (window.confirm('Limpar personagem, instruções e tarefa?')) {
                studio.resetAll()
              }
            }}
          />
        </section>

        <SavedLibrary
          presets={studio.savedPresets}
          onLoad={studio.loadSavedPreset}
          onDelete={studio.deleteSavedPreset}
          onImport={studio.importPreset}
        />
      </main>

      <footer className={styles.footer}>
        <strong>PROMPTOR</strong>
        <span>Gerador de prompts · personagens · instruções — tudo local no navegador.</span>
      </footer>
    </div>
  )
}
