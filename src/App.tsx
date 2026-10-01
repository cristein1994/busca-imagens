import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AgeGate } from './components/AgeGate'
import { CharacterBuilder } from './components/CharacterBuilder'
import { ChatPanel } from './components/ChatPanel'
import { Gallery } from './components/Gallery'
import { ResultStage } from './components/ResultStage'
import { StyleControls } from './components/StyleControls'
import { Tabs } from './components/Tabs'
import {
  addToGallery,
  clearGallery,
  isAgeVerified,
  loadGallery,
  removeFromGallery,
  setAgeVerified,
} from './lib/galleryStorage'
import { generateImage } from './lib/pollinations'
import { buildFullPrompt, DEFAULT_CHARACTER } from './lib/promptBuilder'
import type {
  AppTab,
  AspectRatio,
  ArtStyle,
  CharacterConfig,
  GalleryItem,
  Intensity,
} from './types/generator'

export default function App() {
  const [ageOk, setAgeOk] = useState(isAgeVerified)
  const [tab, setTab] = useState<AppTab>('generate')
  const [character, setCharacter] = useState<CharacterConfig>(DEFAULT_CHARACTER)
  const [prompt, setPrompt] = useState(
    'bedroom at night, soft neon light, intimate atmosphere',
  )
  const [negativePrompt, setNegativePrompt] = useState(
    'child, minor, underage, low quality, blurry, deformed hands',
  )
  const [style, setStyle] = useState<ArtStyle>('anime')
  const [intensity, setIntensity] = useState<Intensity>('nsfw')
  const [aspect, setAspect] = useState<AspectRatio>('3:4')
  const [seed, setSeed] = useState(0)
  const [useCharacter, setUseCharacter] = useState(true)
  const [imageModel, setImageModel] = useState('flux')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editPrompt, setEditPrompt] = useState(
    'same person, different pose, more dramatic lighting',
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [lastPrompt, setLastPrompt] = useState('')
  const [lastSeed, setLastSeed] = useState<number | null>(null)
  const [lastMeta, setLastMeta] = useState<{
    width: number
    height: number
    style: ArtStyle
    intensity: Intensity
  } | null>(null)
  const [gallery, setGallery] = useState<GalleryItem[]>(() => loadGallery())

  const abortRef = useRef<AbortController | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const requestBase = useMemo(
    () => ({
      prompt,
      negativePrompt,
      style,
      aspect,
      intensity,
      character,
      seed,
      useCharacter,
      imageModel,
    }),
    [
      prompt,
      negativePrompt,
      style,
      aspect,
      intensity,
      character,
      seed,
      useCharacter,
      imageModel,
    ],
  )

  const previewPrompt = useMemo(
    () => buildFullPrompt(requestBase),
    [requestBase],
  )

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const runGenerate = useCallback(
    async (overrides?: {
      seed?: number
      prompt?: string
      imageUrl?: string
      useCharacter?: boolean
    }) => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      setError('')

      try {
        const req = {
          ...requestBase,
          seed: overrides?.seed ?? requestBase.seed,
          prompt: overrides?.prompt ?? requestBase.prompt,
          useCharacter: overrides?.useCharacter ?? requestBase.useCharacter,
        }
        const result = await generateImage(req, {
          imageUrl: overrides?.imageUrl,
          signal: ac.signal,
        })

        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = result.blobUrl
        setImageUrl(result.blobUrl)
        setLastPrompt(result.prompt)
        setLastSeed(result.seed)
        setLastMeta({
          width: result.width,
          height: result.height,
          style: req.style,
          intensity: req.intensity,
        })
        setSeed(result.seed)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Erro ao gerar')
      } finally {
        setLoading(false)
      }
    },
    [requestBase],
  )

  function handleSaveGallery() {
    if (!imageUrl || lastSeed == null || !lastMeta) return
    const item: GalleryItem = {
      id: crypto.randomUUID(),
      url: imageUrl,
      prompt: lastPrompt,
      style: lastMeta.style,
      intensity: lastMeta.intensity,
      seed: lastSeed,
      createdAt: Date.now(),
      width: lastMeta.width,
      height: lastMeta.height,
    }
    setGallery(addToGallery(item))
  }

  function handleAgeConfirm() {
    setAgeVerified()
    setAgeOk(true)
  }

  if (!ageOk) {
    return <AgeGate onConfirm={handleAgeConfirm} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">SoulForge</div>
          <div className="brand-sub">
            Funções free parelhas ao SoulGen · NSFW liberado
          </div>
        </div>
        <div className="badge-nsfw">NSFW ON · 18+</div>
      </header>

      <Tabs active={tab} onChange={setTab} />

      {(tab === 'generate' || tab === 'character') && (
        <div className="layout">
          <aside className="panel">
            {tab === 'character' ? (
              <CharacterBuilder value={character} onChange={setCharacter} />
            ) : (
              <>
                <h2>Gerar imagem</h2>
                <StyleControls
                  style={style}
                  intensity={intensity}
                  aspect={aspect}
                  seed={seed}
                  useCharacter={useCharacter}
                  imageModel={imageModel}
                  onStyle={setStyle}
                  onIntensity={setIntensity}
                  onAspect={setAspect}
                  onSeed={setSeed}
                  onUseCharacter={setUseCharacter}
                  onModel={setImageModel}
                />
                <div className="field">
                  <label htmlFor="prompt">Prompt / cena</label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Descreva a cena…"
                  />
                </div>
                <div className="field">
                  <label htmlFor="neg">Negativo</label>
                  <textarea
                    id="neg"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="prompt-preview">{previewPrompt}</div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => void runGenerate()}
                >
                  {loading ? 'Gerando…' : 'Gerar (grátis · NSFW)'}
                </button>
              </>
            )}

            {tab === 'character' && (
              <>
                <div className="prompt-preview" style={{ marginTop: '0.85rem' }}>
                  {buildFullPrompt({ ...requestBase, useCharacter: true })}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => {
                    setUseCharacter(true)
                    setTab('generate')
                    void runGenerate({ useCharacter: true })
                  }}
                >
                  Gerar com este personagem
                </button>
              </>
            )}
          </aside>
          <ResultStage
            imageUrl={imageUrl}
            loading={loading}
            error={error}
            prompt={lastPrompt}
            seed={lastSeed}
            onSave={handleSaveGallery}
            onVary={() =>
              void runGenerate({ seed: Math.floor(Math.random() * 1_000_000) })
            }
          />
        </div>
      )}

      {tab === 'edit' && (
        <div className="layout">
          <aside className="panel">
            <h2>Editar / remix</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 0 }}>
              Cole a URL de uma imagem (ou da galeria) e descreva a edição —
              img2img gratuito.
            </p>
            <div className="field">
              <label htmlFor="edit-url">URL da imagem</label>
              <input
                id="edit-url"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="field">
              <label htmlFor="edit-prompt">O que mudar</label>
              <textarea
                id="edit-prompt"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
              />
            </div>
            <StyleControls
              style={style}
              intensity={intensity}
              aspect={aspect}
              seed={seed}
              useCharacter={false}
              imageModel={imageModel}
              onStyle={setStyle}
              onIntensity={setIntensity}
              onAspect={setAspect}
              onSeed={setSeed}
              onUseCharacter={() => undefined}
              onModel={setImageModel}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading || !editImageUrl.trim()}
              onClick={() =>
                void runGenerate({
                  prompt: editPrompt,
                  imageUrl: editImageUrl.trim(),
                  useCharacter: false,
                })
              }
            >
              {loading ? 'Editando…' : 'Aplicar edição'}
            </button>
          </aside>
          <ResultStage
            imageUrl={imageUrl}
            loading={loading}
            error={error}
            prompt={lastPrompt}
            seed={lastSeed}
            onSave={handleSaveGallery}
            onVary={() =>
              void runGenerate({
                prompt: editPrompt,
                imageUrl: editImageUrl.trim() || undefined,
                useCharacter: false,
                seed: Math.floor(Math.random() * 1_000_000),
              })
            }
          />
        </div>
      )}

      {tab === 'chat' && <ChatPanel character={character} />}

      {tab === 'gallery' && (
        <Gallery
          items={gallery}
          onSelect={(item) => {
            setImageUrl(item.url)
            setLastPrompt(item.prompt)
            setLastSeed(item.seed)
            setEditImageUrl(item.url)
            setTab('generate')
          }}
          onRemove={(id) => setGallery(removeFromGallery(id))}
          onClear={() => {
            clearGallery()
            setGallery([])
          }}
        />
      )}

      <p className="footer-note">
        SoulForge usa Pollinations.ai (grátis, sem chave). Vídeo HD / lip-sync
        do SoulGen pago não tem equivalente 100% free estável — o restante das
        funções core (gerar, personagem, edit, chat, galeria) está liberado com
        NSFW.
      </p>
    </div>
  )
}
