import type { CharacterConfig } from '../types/generator'
import {
  EYE_COLORS,
  EXPRESSIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  POSES,
  SKIN_TONES,
} from '../lib/promptBuilder'

interface CharacterBuilderProps {
  value: CharacterConfig
  onChange: (next: CharacterConfig) => void
  compact?: boolean
}

export function CharacterBuilder({
  value,
  onChange,
  compact,
}: CharacterBuilderProps) {
  const set = <K extends keyof CharacterConfig>(key: K, v: CharacterConfig[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div>
      {!compact && <h2>Personagem AI</h2>}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="gender">Gênero</label>
          <select
            id="gender"
            value={value.gender}
            onChange={(e) =>
              set('gender', e.target.value as CharacterConfig['gender'])
            }
          >
            <option value="woman">Mulher</option>
            <option value="man">Homem</option>
            <option value="nonbinary">Não-binário</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="age">Idade (18+)</label>
          <input
            id="age"
            type="number"
            min={18}
            max={80}
            value={value.age}
            onChange={(e) =>
              set('age', Math.max(18, Number(e.target.value) || 18))
            }
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="hairColor">Cabelo</label>
          <select
            id="hairColor"
            value={value.hairColor}
            onChange={(e) => set('hairColor', e.target.value)}
          >
            {HAIR_COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hairStyle">Estilo</label>
          <select
            id="hairStyle"
            value={value.hairStyle}
            onChange={(e) => set('hairStyle', e.target.value)}
          >
            {HAIR_STYLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="eyeColor">Olhos</label>
          <select
            id="eyeColor"
            value={value.eyeColor}
            onChange={(e) => set('eyeColor', e.target.value)}
          >
            {EYE_COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="skinTone">Pele</label>
          <select
            id="skinTone"
            value={value.skinTone}
            onChange={(e) => set('skinTone', e.target.value)}
          >
            {SKIN_TONES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="bodyType">Corpo</label>
        <select
          id="bodyType"
          value={value.bodyType}
          onChange={(e) =>
            set('bodyType', e.target.value as CharacterConfig['bodyType'])
          }
        >
          <option value="slim">Magro</option>
          <option value="athletic">Atlético</option>
          <option value="curvy">Curvilíneo</option>
          <option value="muscular">Musculoso</option>
          <option value="plus">Plus size</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="outfit">Roupa / nudez</label>
        <select
          id="outfit"
          value={value.outfit}
          onChange={(e) => set('outfit', e.target.value)}
        >
          {OUTFITS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="pose">Pose</label>
        <select
          id="pose"
          value={value.pose}
          onChange={(e) => set('pose', e.target.value)}
        >
          {POSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="expression">Expressão</label>
        <select
          id="expression"
          value={value.expression}
          onChange={(e) => set('expression', e.target.value)}
        >
          {EXPRESSIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="extras">Extras</label>
        <input
          id="extras"
          value={value.extras}
          placeholder="tatuagem, piercing, cenário…"
          onChange={(e) => set('extras', e.target.value)}
        />
      </div>
    </div>
  )
}
