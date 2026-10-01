export type ArtStyle =
  | 'anime'
  | 'realistic'
  | 'semi'
  | '3d'
  | 'comic'
  | 'oil'

export type AspectRatio = '1:1' | '3:4' | '9:16' | '4:3' | '16:9'

export type Gender = 'woman' | 'man' | 'nonbinary'

export type BodyType = 'slim' | 'athletic' | 'curvy' | 'muscular' | 'plus'

export type Intensity = 'sfw' | 'suggestive' | 'nsfw' | 'explicit'

export interface CharacterConfig {
  gender: Gender
  age: number
  hairColor: string
  hairStyle: string
  eyeColor: string
  skinTone: string
  bodyType: BodyType
  outfit: string
  expression: string
  pose: string
  extras: string
}

export interface GenerationRequest {
  prompt: string
  negativePrompt: string
  style: ArtStyle
  aspect: AspectRatio
  intensity: Intensity
  character: CharacterConfig
  seed: number
  useCharacter: boolean
  imageModel: string
}

export interface GalleryItem {
  id: string
  url: string
  prompt: string
  style: ArtStyle
  intensity: Intensity
  seed: number
  createdAt: number
  width: number
  height: number
}

export type AppTab = 'generate' | 'character' | 'edit' | 'chat' | 'gallery'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}
