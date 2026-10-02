import type { AspectRatio, ArtStyle, Intensity } from '../types/generator'
import { INTENSITY_OPTIONS, STYLE_OPTIONS } from '../lib/promptBuilder'

interface ControlsProps {
  style: ArtStyle
  intensity: Intensity
  aspect: AspectRatio
  seed: number
  useCharacter: boolean
  imageModel: string
  onStyle: (v: ArtStyle) => void
  onIntensity: (v: Intensity) => void
  onAspect: (v: AspectRatio) => void
  onSeed: (v: number) => void
  onUseCharacter: (v: boolean) => void
  onModel: (v: string) => void
}

const ASPECTS: AspectRatio[] = ['1:1', '3:4', '9:16', '4:3', '16:9']
const MODELS = [
  { id: 'chroma', label: 'Chroma (NSFW)' },
  { id: 'flux', label: 'Flux (qualidade)' },
  { id: 'turbo', label: 'Turbo (rápido)' },
  { id: 'z-image-turbo', label: 'Z-Image Turbo' },
]

export function StyleControls({
  style,
  intensity,
  aspect,
  seed,
  useCharacter,
  imageModel,
  onStyle,
  onIntensity,
  onAspect,
  onSeed,
  onUseCharacter,
  onModel,
}: ControlsProps) {
  return (
    <>
      <div className="field">
        <label>Estilo</label>
        <div className="chip-row">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip${style === s.id ? ' active' : ''}`}
              onClick={() => onStyle(s.id)}
              title={s.blurb}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Intensidade NSFW</label>
        <div className="chip-row">
          {INTENSITY_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip${intensity === s.id ? ' active' : ''}`}
              onClick={() => onIntensity(s.id)}
              title={s.blurb}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toggle-row">
        <span>Usar personagem builder</span>
        <button
          type="button"
          className={`switch${useCharacter ? ' on' : ''}`}
          aria-pressed={useCharacter}
          onClick={() => onUseCharacter(!useCharacter)}
          aria-label="Alternar personagem"
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="aspect">Proporção</label>
          <select
            id="aspect"
            value={aspect}
            onChange={(e) => onAspect(e.target.value as AspectRatio)}
          >
            {ASPECTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="model">Modelo</label>
          <select
            id="model"
            value={imageModel}
            onChange={(e) => onModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="seed">Seed (0 = aleatório)</label>
        <input
          id="seed"
          type="number"
          min={0}
          value={seed}
          onChange={(e) => onSeed(Number(e.target.value) || 0)}
        />
      </div>
    </>
  )
}
