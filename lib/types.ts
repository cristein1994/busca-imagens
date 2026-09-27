export type Lane = 'surface' | 'dark' | 'both'

export type OsintResult = {
  title: string
  url: string
  displayUrl: string
  snippet: string
  scrapedExcerpt: string | null
  source: 'duckduckgo' | 'ahmia'
  lane: 'surface' | 'dark'
}

export type OsintSummary = {
  headline: string
  brief: string
  themes: string[]
  topDomains: { host: string; count: number }[]
}

export type LaneReport = {
  ok: true
  lane: 'surface' | 'dark'
  count: number
  minimum: number
  metMinimum: boolean
  scrapedPages: number
  via: string
  summary: OsintSummary
  results: OsintResult[]
}

export type LaneFailure = {
  ok: false
  lane: 'surface' | 'dark'
  error: string
}

export type TorStatus = {
  systemdAvailable: boolean
  torUnit: string
  torDefaultUnit: string
  unitEnabled: boolean
  socksPort: number
  socksOpen: boolean
  ready: boolean
  detail: string
}
