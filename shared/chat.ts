export type ChatType = 'channel' | 'group'

export type ChatSource = 'catalog' | 'index' | 'live'

export interface Chat {
  username: string
  title: string
  description: string
  type: ChatType
  category: string
  language: string
  members: number | null
  online: number | null
  verified: boolean
  photo: string | null
  link: string
  source: ChatSource
  live: boolean
}

export interface PostPreview {
  id: string
  text: string
  date: string | null
  link: string
}

export interface SearchResponse {
  query: string
  results: Chat[]
  warning: string | null
  index: 'ok' | 'unavailable' | 'skipped'
  catalogSize: number
}

export interface ChatResponse {
  chat: Chat
  posts: PostPreview[]
  postsNote: string | null
}

export const CATEGORIES = [
  'Official',
  'News',
  'Tech',
  'Community',
  'Crypto',
  'Finance',
  'Business',
  'Sports',
  'Games',
  'Design',
  'Science',
  'Entertainment',
] as const

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Russian' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'es', label: 'Spanish' },
  { id: 'it', label: 'Italian' },
] as const
