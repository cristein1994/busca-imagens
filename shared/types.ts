export type Role = 'user' | 'assistant' | 'note'

export type Turn = {
  role: Role
  text: string
  at: string
}

export type Session = {
  model: string
  system: string
  search: boolean
  previousResponseId: string | null
  turns: Turn[]
}

export const DEFAULT_MODEL = 'grok-4.7'

export const MODELS: { id: string; label: string }[] = [
  { id: 'grok-4.7', label: 'Grok 4.7' },
  { id: 'grok-4.6', label: 'Grok 4.6' },
  { id: 'grok-4', label: 'Grok 4' },
  { id: 'grok-3', label: 'Grok 3' },
  { id: 'grok-3-mini', label: 'Grok 3 mini' },
]

export const DEFAULT_SYSTEM = [
  'Você é o Grok dentro do terminal RODE.',
  'Responda no idioma do usuário, em texto puro, direto, adequado a um terminal.',
  'Sem preâmbulo, sem moldura de chat.',
].join(' ')

export function emptySession(model = DEFAULT_MODEL): Session {
  return {
    model,
    system: DEFAULT_SYSTEM,
    search: false,
    previousResponseId: null,
    turns: [],
  }
}

export function nowIso(): string {
  return new Date().toISOString()
}
