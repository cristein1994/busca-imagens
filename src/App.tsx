import { useEffect, useRef, useState } from 'react'
import styles from './App.module.css'
import {
  fetchHealth,
  generateImage,
  toDataUrl,
  type HealthInfo,
} from './lib/api'
import {
  DEFAULT_NSFW_NEGATIVE,
  DEFAULT_NSFW_PROMPT,
  NSFW_PRESETS,
  withNsfwBoost,
  type NsfwPreset,
} from './lib/nsfw'

export default function App() {
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [prompt, setPrompt] = useState(DEFAULT_NSFW_PROMPT)
  const [negative, setNegative] = useState(DEFAULT_NSFW_NEGATIVE)
  const [seed, setSeed] = useState(0)
  const [steps, setSteps] = useState(32)
  const [guidance, setGuidance] = useState(3.8)
  const [width, setWidth] = useState(768)
  const [height, setHeight] = useState(1024)
  const [presetId, setPresetId] = useState('full-body')
  const [boostNsfw, setBoostNsfw] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [meta, setMeta] = useState('Full NSFW · penis explícito · adultos 21+')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
    return () => abortRef.current?.abort()
  }, [])

  function applyPreset(preset: NsfwPreset) {
    setPresetId(preset.id)
    setPrompt(preset.prompt)
    setWidth(preset.width)
    setHeight(preset.height)
    setGuidance(preset.guidance)
    setSteps(preset.steps)
    setNegative(DEFAULT_NSFW_NEGATIVE)
  }

  async function onGenerate() {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError('')
    const finalPrompt = boostNsfw ? withNsfwBoost(prompt) : prompt.trim()
    const finalSeed = seed || Math.floor(Math.random() * 1_000_000)
    try {
      const result = await generateImage(
        {
          prompt: finalPrompt,
          negative_prompt: negative.trim() || DEFAULT_NSFW_NEGATIVE,
          seed: finalSeed,
          width,
          height,
          guidance_scale: guidance,
          num_inference_steps: steps,
        },
        ctrl.signal,
      )
      setSeed(finalSeed)
      setImageUrl(toDataUrl(result.mime, result.image_base64))
      setMeta(
        `FULL NSFW · ${result.space} · seed ${result.seed} · ${result.width}×${result.height} · ${result.steps} steps · ${result.elapsed_sec}s`,
      )
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message || 'Falha na geração')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.brandRow}>
        <h1 className={styles.brand}>CHROMA</h1>
        <span className={styles.badge}>Full NSFW · penis · 21+</span>
      </div>
      <p className={styles.tagline}>
        Chroma1-HD em modo <strong>Full NSFW</strong>: nudez masculina
        explícita com pau visível, sem censura. Só adultos 21+. Lodestones /
        FLUX.1-schnell modificado · Apache 2.0.
      </p>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.label}>
            Presets Full NSFW
            <div className={styles.chipRow}>
              {NSFW_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.chip}${presetId === p.id ? ` ${styles.chipActive}` : ''}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className={styles.label}>
            Prompt
            <textarea
              className={styles.textarea}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Negative (anti-censura / anti-menor)
            <textarea
              className={styles.textarea}
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
              style={{ minHeight: 72 }}
            />
          </label>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={boostNsfw}
              onChange={(e) => setBoostNsfw(e.target.checked)}
            />
            Forçar tags Full NSFW + penis no prompt
          </label>

          <div className={styles.row}>
            <label className={styles.label}>
              Seed (0 = aleatória)
              <input
                className={styles.input}
                type="number"
                min={0}
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value) || 0)}
              />
            </label>
            <label className={styles.label}>
              Tamanho
              <select
                className={styles.select}
                value={`${width}x${height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number)
                  setWidth(w)
                  setHeight(h)
                }}
              >
                <option value="768x1024">768×1024 (retrato)</option>
                <option value="1024x1024">1024×1024</option>
                <option value="1024x768">1024×768</option>
                <option value="768x768">768×768</option>
              </select>
            </label>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>
              Steps
              <input
                className={styles.input}
                type="number"
                min={1}
                max={60}
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value) || 1)}
              />
            </label>
            <label className={styles.label}>
              Guidance
              <input
                className={styles.input}
                type="number"
                min={1}
                max={10}
                step={0.1}
                value={guidance}
                onChange={(e) => setGuidance(Number(e.target.value) || 1)}
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={loading || !prompt.trim()}
              onClick={onGenerate}
            >
              {loading ? 'Gerando Full NSFW…' : 'Gerar Full NSFW + pau'}
            </button>
            <button
              type="button"
              className={styles.ghost}
              disabled={loading}
              onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
            >
              Seed aleatória
            </button>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <p className={styles.meta}>
            {health ? (
              <>
                Backend OK · {health.model} · modo Full NSFW (penis)
              </>
            ) : (
              <>API em {`/api`} — suba com <code>npm run dev:api</code></>
            )}
            <br />
            {meta}
          </p>
        </section>

        <section className={styles.stage} aria-live="polite">
          {imageUrl ? (
            <img src={imageUrl} alt="Resultado Full NSFW Chroma1-HD" />
          ) : (
            <div className={styles.placeholder}>
              <strong>Full NSFW pronto</strong>
              Escolha um preset ou escreva o prompt. O modelo força nudez
              masculina explícita com pau visível (21+).
            </div>
          )}
        </section>
      </div>

      <footer className={styles.footer}>
        <span>Modo: Full NSFW + penis</span>
        <span>Adultos 21+ apenas</span>
        <a
          href="https://huggingface.co/lodestones/Chroma1-HD"
          target="_blank"
          rel="noreferrer"
        >
          lodestones/Chroma1-HD
        </a>
      </footer>
    </div>
  )
}
