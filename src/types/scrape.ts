export type ScrapeMode = 'profile' | 'search' | 'company' | 'jobs'

export type ScrapeResult = {
  mode: ScrapeMode
  actor: string
  input: Record<string, unknown>
  runId: string
  status: string
  datasetId?: string
  itemCount: number
  items: Record<string, unknown>[]
}

export type HealthResponse = {
  ok: boolean
  hasToken: boolean
  actors: Record<ScrapeMode, string>
}

export type ModeConfig = {
  id: ScrapeMode
  label: string
  blurb: string
  actor: string
}

export const MODES: ModeConfig[] = [
  {
    id: 'profile',
    label: 'Perfis',
    blurb: 'Scrapa perfis públicos por URL ou slug.',
    actor: 'harvestapi/linkedin-profile-scraper',
  },
  {
    id: 'search',
    label: 'Busca pessoas',
    blurb: 'Busca profissionais por cargo, skill e localização.',
    actor: 'harvestapi/linkedin-profile-search',
  },
  {
    id: 'company',
    label: 'Empresas',
    blurb: 'Dados de páginas de empresa por URL ou nome.',
    actor: 'harvestapi/linkedin-company',
  },
  {
    id: 'jobs',
    label: 'Vagas',
    blurb: 'Vagas públicas por keywords e localização.',
    actor: 'curious_coder/linkedin-jobs-scraper',
  },
]
