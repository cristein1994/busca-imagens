export type QueryKind = 'email' | 'domain' | 'ip' | 'url' | 'username' | 'phone' | 'keyword' | 'surface' | 'deep'

export const KIND_LABEL: Record<QueryKind, string> = {
  email: 'E-mail',
  domain: 'Domínio',
  ip: 'Endereço IP',
  url: 'URL',
  username: 'Usuário',
  phone: 'Telefone',
  keyword: 'Termo',
  surface: 'Surface web',
  deep: 'Deep',
}

export const QUERY_KINDS = Object.keys(KIND_LABEL) as QueryKind[]

export type Fact = {
  label: string
  value: string
  href?: string
}

export type ResultTable = {
  columns: string[]
  rows: string[][]
}

export type ModuleStatus = 'ok' | 'empty' | 'error'

export type ModuleResult = {
  id: string
  source: string
  title: string
  status: ModuleStatus
  summary: string
  facts: Fact[]
  table?: ResultTable
  error?: string
  ms: number
}

export type SearchResponse = {
  query: string
  normalized: string
  kind: QueryKind
  kindLabel: string
  tookMs: number
  modules: ModuleResult[]
}

export type ClassifiedQuery = {
  raw: string
  normalized: string
  kind: QueryKind
  kindLabel: string
  domain?: string
  ip?: string
  email?: string
  username?: string
  url?: string
  phone?: string
}

export type SavedCase = {
  id: string
  title: string
  query: string
  kind: QueryKind
  kindLabel: string
  notes: string
  createdAt: string
  updatedAt: string
  snapshot: SearchResponse
}
