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

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ServerEvent =
  | { type: 'status'; message: string }
  | { type: 'queries'; queries: string[] }
  | { type: 'sources'; sources: Source[] }
  | { type: 'delta'; content: string }
  | { type: 'reasoning'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
