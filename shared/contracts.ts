export type MediaKind = 'image' | 'video' | 'page'
export type Network = 'surface' | 'onion'
export type SearchMode = 'metadata' | 'content'
export type MediaFilter = 'image' | 'video' | 'both'
export type EngineVia = 'direct' | 'tor' | 'clearnet-fallback' | 'skipped'

export type DorkFields = {
  filetype: string
  site: string
  intitle: string
  inurl: string
  exact: string
  exclude: string
  author: string
  camera: string
  resolution: string
  codec: string
  before: string
  after: string
}

export type SearchRequest = {
  query: string
  mode: SearchMode
  media: MediaFilter
  nsfw: boolean
  dork: DorkFields
  engineIds?: string[]
}

export type MediaHit = {
  id: string
  title: string
  pageUrl: string
  mediaUrl: string | null
  thumbUrl: string | null
  embedUrl: string | null
  kind: MediaKind
  engineId: string
  engineName: string
  network: Network
  snippet: string
}

export type EngineReport = {
  id: string
  name: string
  network: Network
  group: string
  ok: boolean
  via: EngineVia
  resultCount: number
  searchUrl: string
  error?: string
  elapsedMs: number
}

export type TorStatus = {
  ok: boolean
  proxy: string | null
  detail: string
  probed: boolean
}

export type SearchResponse = {
  dork: string
  tor: TorStatus
  engines: EngineReport[]
  results: MediaHit[]
}

export type InspectResponse = {
  url: string
  downloadable: boolean
  contentType: string | null
  bytes: number | null
  kind: MediaKind | null
  detail: string
}

export type EngineInfo = {
  id: string
  name: string
  network: Network
  group: string
  indexes: string
}

export const emptyDork = (): DorkFields => ({
  filetype: '',
  site: '',
  intitle: '',
  inurl: '',
  exact: '',
  exclude: '',
  author: '',
  camera: '',
  resolution: '',
  codec: '',
  before: '',
  after: '',
})
