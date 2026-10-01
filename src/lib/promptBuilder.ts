import type {
  AspectRatio,
  ArtStyle,
  CharacterConfig,
  GenerationRequest,
  Intensity,
} from '../types/generator'

const STYLE_SUFFIX: Record<ArtStyle, string> = {
  anime:
    'anime style, clean lineart, vibrant colors, detailed eyes, studio lighting',
  realistic:
    'photorealistic, 8k, natural skin texture, cinematic lighting, shallow depth of field',
  semi: 'semi-realistic illustration, soft shading, detailed face, premium digital art',
  '3d': '3D render, octane render, subsurface scattering, detailed materials',
  comic: 'comic book art, bold ink, dynamic shading, graphic novel style',
  oil: 'oil painting, rich brush strokes, classical portrait lighting',
}

const INTENSITY_SUFFIX: Record<Intensity, string> = {
  sfw: 'safe for work, clothed, tasteful',
  suggestive: 'sensual, alluring pose, revealing outfit, tasteful eroticism',
  nsfw: 'NSFW, nude, erotic, adult content, uncensored',
  explicit:
    'explicit NSFW, full nude, detailed anatomy, erotic, uncensored, adult only',
}

const ASPECT_SIZE: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '3:4': { width: 768, height: 1024 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
  '16:9': { width: 1280, height: 720 },
}

export function aspectToSize(aspect: AspectRatio) {
  return ASPECT_SIZE[aspect]
}

export function buildCharacterPrompt(c: CharacterConfig): string {
  const age = Math.max(18, Math.min(80, c.age))
  const parts = [
    `${age} year old ${c.gender}`,
    `${c.skinTone} skin`,
    `${c.hairStyle} ${c.hairColor} hair`,
    `${c.eyeColor} eyes`,
    `${c.bodyType} body`,
    c.outfit,
    c.expression ? `${c.expression} expression` : '',
    c.pose,
    c.extras,
  ]
  return parts.filter(Boolean).join(', ')
}

export function buildFullPrompt(req: GenerationRequest): string {
  const chunks: string[] = []

  if (req.useCharacter) {
    chunks.push(buildCharacterPrompt(req.character))
  }

  if (req.prompt.trim()) {
    chunks.push(req.prompt.trim())
  }

  chunks.push(STYLE_SUFFIX[req.style])
  chunks.push(INTENSITY_SUFFIX[req.intensity])
  chunks.push('high quality, highly detailed, masterpiece')

  if (req.negativePrompt.trim()) {
    chunks.push(`Avoid: ${req.negativePrompt.trim()}`)
  }

  // Hard block minors in every prompt
  chunks.push('adult subject only, 18+, no children, no minors')

  return chunks.filter(Boolean).join(', ')
}

export const DEFAULT_CHARACTER: CharacterConfig = {
  gender: 'woman',
  age: 24,
  hairColor: 'black',
  hairStyle: 'long wavy',
  eyeColor: 'brown',
  skinTone: 'fair',
  bodyType: 'curvy',
  outfit: 'elegant lingerie',
  expression: 'seductive smile',
  pose: 'standing portrait, looking at viewer',
  extras: '',
}

export const HAIR_COLORS = [
  'black',
  'brown',
  'blonde',
  'platinum blonde',
  'red',
  'auburn',
  'pink',
  'purple',
  'blue',
  'white',
  'silver',
]

export const HAIR_STYLES = [
  'long straight',
  'long wavy',
  'long curly',
  'short bob',
  'pixie cut',
  'ponytail',
  'braided',
  'messy bun',
  'twin tails',
  'bald fade',
]

export const EYE_COLORS = [
  'brown',
  'hazel',
  'green',
  'blue',
  'gray',
  'amber',
  'violet',
  'heterochromia',
]

export const SKIN_TONES = [
  'pale',
  'fair',
  'light',
  'medium',
  'olive',
  'tan',
  'brown',
  'dark',
]

export const OUTFITS = [
  'casual streetwear',
  'elegant evening dress',
  'business suit',
  'swimsuit',
  'elegant lingerie',
  'leather outfit',
  'fantasy armor',
  'kimono',
  'sportswear',
  'completely nude',
  'towel only',
  'open shirt',
]

export const POSES = [
  'standing portrait, looking at viewer',
  'sitting on chair, elegant pose',
  'lying on bed, relaxed',
  'from behind, looking over shoulder',
  'leaning against wall',
  'kneeling, intimate angle',
  'walking toward camera',
  'close-up face portrait',
  'full body standing',
  'dynamic action pose',
]

export const EXPRESSIONS = [
  'neutral',
  'soft smile',
  'seductive smile',
  'serious',
  'playful',
  'confident',
  'shy blush',
  'intense gaze',
]

export const STYLE_OPTIONS: { id: ArtStyle; label: string; blurb: string }[] = [
  { id: 'anime', label: 'Anime', blurb: 'Lineart limpo, cores vivas' },
  { id: 'realistic', label: 'Realista', blurb: 'Foto cinematic' },
  { id: 'semi', label: 'Semi-real', blurb: 'Ilustração premium' },
  { id: '3d', label: '3D', blurb: 'Render octane' },
  { id: 'comic', label: 'Comic', blurb: 'Graphic novel' },
  { id: 'oil', label: 'Óleo', blurb: 'Pintura clássica' },
]

export const INTENSITY_OPTIONS: {
  id: Intensity
  label: string
  blurb: string
}[] = [
  { id: 'sfw', label: 'SFW', blurb: 'Vestuário completo' },
  { id: 'suggestive', label: 'Sugestivo', blurb: 'Sensual' },
  { id: 'nsfw', label: 'NSFW', blurb: 'Nu erótico' },
  { id: 'explicit', label: 'Explícito', blurb: 'Sem censura' },
]
