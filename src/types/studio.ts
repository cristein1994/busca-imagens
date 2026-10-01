export type Tone =
  | 'formal'
  | 'casual'
  | 'tecnico'
  | 'poetico'
  | 'direto'
  | 'empatico'
  | 'humoristico'
  | 'autoritario'

export type OutputFormat =
  | 'livre'
  | 'markdown'
  | 'bullets'
  | 'json'
  | 'passo-a-passo'
  | 'tabela'
  | 'dialogo'
  | 'codigo'

export type ReasoningStyle =
  | 'rapido'
  | 'explicito'
  | 'socratico'
  | 'critico'
  | 'criativo'

export interface Character {
  id: string
  name: string
  archetype: string
  role: string
  personality: string[]
  tone: Tone
  voice: string
  background: string
  knowledge: string[]
  boundaries: string[]
  catchphrases: string[]
  exampleDialogue: string
  language: string
}

export interface Instructions {
  id: string
  title: string
  mission: string
  audience: string
  outputFormat: OutputFormat
  reasoning: ReasoningStyle
  constraints: string[]
  mustInclude: string[]
  mustAvoid: string[]
  successCriteria: string
  context: string
}

export interface PromptTask {
  goal: string
  context: string
  extraNotes: string
  length: 'curto' | 'medio' | 'longo' | 'sem-limite'
  creativity: number
}

export interface SavedPreset {
  id: string
  name: string
  createdAt: string
  character: Character
  instructions: Instructions
  task: PromptTask
}

export interface StudioState {
  character: Character
  instructions: Instructions
  task: PromptTask
  savedPresets: SavedPreset[]
}
