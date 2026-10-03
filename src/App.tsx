import { useEffect, useRef, useState } from 'react'
import styles from './App.module.css'
import {
  fetchHealth,
  generateImage,
  toDataUrl,
  type HealthInfo,
} from './lib/api'

const DEMO_PROMPT =
  'A high-fashion close-up portrait of a blonde woman in clear sunglasses. The image uses a bold teal and red color split for dramatic lighting. The background is a simple teal-green. Sharp professional photo.'

const DEFAULT_NEGATIVE =
  'low quality, ugly, unfinished, out of focus, deformed, disfigure, blurry, smudged, restricted palette, flat colors'

export default function App() {
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [prompt, setPrompt] = useState(DEMO_PROMPT)
  const [negative, setNegative] = useState(DEFAULT_NEGATIVE)
  const [seed, setSeed] = useState(433)
  const [steps, setSteps] = useState(28)
  const [guidance, setGuidance] = useState(3)
  const [size, setSize] = useState(768)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>('/api/demo')
  const [meta, setMeta] = useState<string>('demo · lodestones/Chroma1-HD')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
    return () => abortRef.current?.abort()
  }, [])

  async function onGenerate() {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError('')
    try {
      const result = await generateImage(
        {
          prompt: prompt.trim(),
          negative_prompt: negative.trim(),
          seed,
          width: size,
          height: size,
          guidance_scale: guidance,
          num_inference_steps: steps,
        },
        ctrl.signal,
      )
      setImageUrl(toDataUrl(result.mime, result.image_base64))
      setMeta(
        `${result.space} · seed ${result.seed} · ${result.width}×${result.height} · ${result.steps} steps · ${result.elapsed_sec}s`,
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
        <span className={styles.badge}>Chroma1-HD · 8.9B · Apache 2.0</span>
      </div>
      <p className={styles.tagline}>
        Modelo open-source da Lodestones, derivado do FLUX.1-schnell com
        modificações arquiteturais. Rodando aqui via Spaces do Hugging Face
        (esta VM não tem GPU).
      </p>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <label className={styles.label}>
            Prompt
            <textarea
              className={styles.textarea}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Negative prompt
            <textarea
              className={styles.textarea}
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
              style={{ minHeight: 72 }}
            />
          </label>

          <div className={styles.row}>
            <label className={styles.label}>
              Seed
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
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              >
                <option value={512}>512</option>
                <option value={768}>768</option>
                <option value={1024}>1024</option>
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
              {loading ? 'Gerando com Chroma…' : 'Gerar com Chroma1-HD'}
            </button>
            <button
              type="button"
              className={styles.ghost}
              disabled={loading}
              onClick={() => {
                setSeed(Math.floor(Math.random() * 1_000_000))
              }}
            >
              Seed aleatória
            </button>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <p className={styles.meta}>
            {health ? (
              <>
                Backend OK · {health.model} · spaces:{' '}
                {health.spaces.join(', ')}
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
            <img src={imageUrl} alt="Resultado Chroma1-HD" />
          ) : (
            <div className={styles.placeholder}>
              <strong>Pronto para gerar</strong>
              Resultado do Chroma1-HD aparece aqui. A primeira chamada pode
              aquecer o Space (~30–90s).
            </div>
          )}
        </section>
      </div>

      <footer className={styles.footer}>
        <span>Base: FLUX.1-schnell (modificado)</span>
        <span>Licença: Apache 2.0</span>
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
