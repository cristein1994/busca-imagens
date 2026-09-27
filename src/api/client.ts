import type { LibraryItem, Modelfile, PageDraft, Source, StreamEvent } from '../types.ts'

type ChatPayload = {
  model: string
  system: string
  temperature: number
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export async function getHealth(): Promise<{ configured: boolean }> {
  const response = await fetch('/api/health')
  if (!response.ok) throw new Error('O servidor não respondeu.')
  return response.json() as Promise<{ configured: boolean }>
}

export async function getModelfile(): Promise<Modelfile> {
  const response = await fetch('/api/modelfile')
  if (!response.ok) throw new Error('Não foi possível ler o modelfile.')
  return response.json() as Promise<Modelfile>
}

export async function putModelfile(raw: string): Promise<Modelfile> {
  return requestJson('/api/modelfile', { method: 'PUT', body: { raw } })
}

export async function getLibrary(): Promise<LibraryItem[]> {
  const response = await fetch('/api/library')
  if (!response.ok) throw new Error('Não foi possível abrir a Guarda web.')
  const payload = (await response.json()) as { items: LibraryItem[] }
  return payload.items
}

export async function postLibraryItem(input: {
  kind: 'page' | 'report'
  title: string
  url: string
  content: string
  query: string
  sources: Source[]
}): Promise<LibraryItem> {
  const payload = await requestJson<{ item: LibraryItem }>('/api/library', {
    method: 'POST',
    body: input,
  })
  return payload.item
}

export async function removeLibraryItem(id: string): Promise<void> {
  const response = await fetch(`/api/library/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Não foi possível apagar o item.')
}

export async function fetchPage(url: string): Promise<PageDraft> {
  return requestJson('/api/fetch', { method: 'POST', body: { url } })
}

export function streamChat(
  body: ChatPayload,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  return postStream('/api/chat', body, signal, onEvent)
}

export function streamDeepSearch(
  body: { query: string; model: string; system: string; temperature: number },
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  return postStream('/api/deep-search', body, signal, onEvent)
}

async function postStream(
  path: string,
  body: unknown,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
) {
  const response = await fetch(path, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const type = response.headers.get('content-type') ?? ''
  if (!response.ok || !type.includes('text/event-stream')) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message || 'A requisição falhou.')
  }
  await readSse(response, onEvent)
}

async function requestJson<T>(path: string, init: { method: string; body: unknown }): Promise<T> {
  const response = await fetch(path, {
    method: init.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(init.body),
  })
  const payload = (await response.json().catch(() => null)) as ({ message?: string } & T) | null
  if (!response.ok) throw new Error(payload?.message || 'A requisição falhou.')
  return payload as T
}

async function readSse(response: Response, onEvent: (event: StreamEvent) => void) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Resposta vazia do servidor.')
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const line = chunk.split('\n').find((item) => item.startsWith('data:'))
      if (!line) continue
      const raw = line.slice(5).trim()
      if (!raw) continue
      onEvent(JSON.parse(raw) as StreamEvent)
    }
  }
}
