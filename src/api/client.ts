import type { StatusPayload, StreamEvent } from '../types.ts'

export async function getStatus(): Promise<StatusPayload> {
  const response = await fetch('/api/status')
  if (!response.ok) throw new Error('Status indisponível.')
  return (await response.json()) as StatusPayload
}

export function streamChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  return postStream('/api/chat', { messages }, signal, onEvent)
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
