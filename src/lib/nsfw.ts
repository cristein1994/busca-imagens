/** Full NSFW profile — adult men (21+), explicit penis anatomy */

export const NSFW_SUFFIX =
  ', full nsfw, uncensored, explicit male nudity, detailed penis, cock visible, realistic genitals, adult 21+ only'

export const DEFAULT_NSFW_PROMPT =
  'hyperrealistic full body nude adult blonde man, 28 years old, standing in locker room, detailed erect penis, natural pubic hair, athletic body, soft fluorescent light, sharp focus, photorealistic, uncensored'

export const DEFAULT_NSFW_NEGATIVE =
  [
    'child',
    'minor',
    'underage',
    'teen',
    'boy',
    'baby',
    'censored',
    'mosaic',
    'blurred genitals',
    'covered penis',
    'underwear',
    'clothing',
    'towel covering crotch',
    'low quality',
    'blurry',
    'deformed',
    'extra limbs',
    'bad anatomy',
    'female',
  ].join(', ')

export type NsfwPreset = {
  id: string
  label: string
  prompt: string
  width: number
  height: number
  guidance: number
  steps: number
}

export const NSFW_PRESETS: NsfwPreset[] = [
  {
    id: 'full-body',
    label: 'Corpo + pau',
    prompt:
      'hyperrealistic full body nude adult man, detailed penis hanging, natural pubic hair, athletic build, standing facing camera, studio lighting, uncensored nsfw, 25+ adult',
    width: 768,
    height: 1024,
    guidance: 3.8,
    steps: 32,
  },
  {
    id: 'vestiario',
    label: 'Vestiário',
    prompt:
      'hyperrealistic several adult blonde men nude in locker room changing, detailed penises visible, towels lockers background, candid photo, fluorescent light, uncensored full nsfw, all 25+ adults',
    width: 768,
    height: 1024,
    guidance: 3.8,
    steps: 30,
  },
  {
    id: 'closeup',
    label: 'Close pau',
    prompt:
      'extreme close-up adult man erect penis, detailed cock glans veins, pubic hair, realistic skin, soft studio light, sharp focus, uncensored nsfw, 25+ adult only',
    width: 768,
    height: 1024,
    guidance: 4.0,
    steps: 36,
  },
  {
    id: 'duo',
    label: 'Dois homens',
    prompt:
      'hyperrealistic two nude adult men together in locker room, detailed penises, muscular blonde and brunette, intimate proximity, candid documentary, uncensored full nsfw, 25+ adults',
    width: 768,
    height: 1024,
    guidance: 3.7,
    steps: 32,
  },
]

export function withNsfwBoost(prompt: string): string {
  const base = prompt.trim()
  if (!base) return base
  const lower = base.toLowerCase()
  if (lower.includes('full nsfw') && lower.includes('penis')) return base
  return `${base}${NSFW_SUFFIX}`
}
