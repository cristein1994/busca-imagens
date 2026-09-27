export type Source = {
  title: string
  url: string
  snippet: string
  content?: string
}

export type LibraryItem = {
  id: string
  kind: 'page' | 'report'
  title: string
  url: string
  content: string
  query: string
  createdAt: string
  sources: Source[]
}

export type ChatTurn = {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning: string
  sources: Source[]
  queries: string[]
  query: string
  status: string
  pending: boolean
  error: boolean
}

export type StreamEvent =
  | { type: 'status'; message: string }
  | { type: 'queries'; queries: string[] }
  | { type: 'sources'; sources: Source[] }
  | { type: 'delta'; content: string }
  | { type: 'reasoning'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type Modelfile = {
  raw: string
  system: string
  temperature: number
}

export type PageDraft = {
  title: string
  url: string
  content: string
  excerpt: string
}
