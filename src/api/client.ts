import type { EngineInfo, InspectResponse, SearchRequest, SearchResponse, TorStatus } from '../../shared/contracts.ts'

export async function fetchCatalog(): Promise<{ engines: EngineInfo[]; surface: number; onion: number }> {
  const response = await fetch('/api/engines')
  if (!response.ok) throw new Error('Não foi possível carregar os motores.')
  return response.json() as Promise<{ engines: EngineInfo[]; surface: number; onion: number }>
}

export async function fetchTor(probe = false): Promise<TorStatus> {
  const response = await fetch(probe ? '/api/tor?probe=1' : '/api/tor')
  if (!response.ok) throw new Error('Falha ao consultar o Tor.')
  return response.json() as Promise<TorStatus>
}

export async function searchMedia(body: SearchRequest): Promise<SearchResponse> {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as SearchResponse & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'A busca falhou.')
  return data
}

export async function inspectMedia(url: string): Promise<InspectResponse> {
  const response = await fetch(`/api/inspect?url=${encodeURIComponent(url)}`)
  const data = (await response.json()) as InspectResponse & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Não foi possível inspecionar a URL.')
  return data
}

export function previewSrc(url: string): string {
  return `/api/preview?url=${encodeURIComponent(url)}`
}

export function downloadSrc(url: string): string {
  return `/api/download?url=${encodeURIComponent(url)}`
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return 'tamanho desconhecido'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
