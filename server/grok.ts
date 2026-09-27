import { pushSse } from '../shared/sse.ts'
import type { Session } from '../shared/types.ts'

const ENDPOINT = 'https://api.x.ai/v1/responses'

export type StreamEvent =
  | { kind: 'delta'; text: string }
  | { kind: 'done'; responseId: string | null; text: string }

type Message = { role: string; content: string }

export class GrokError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'GrokError'
    this.status = status
  }
}

function errorMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string }
    if (typeof parsed.error === 'string' && parsed.error) return parsed.error
    if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) return parsed.error.message
    if (parsed.message) return parsed.message
  } catch {
    /* corpo não-JSON */
  }
  const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 280)
  return snippet || `a API do Grok respondeu ${status}`
}

function textFromResponse(response: Record<string, unknown> | undefined): string {
  if (!response) return ''
  if (typeof response.output_text === 'string') return response.output_text
  const output = response.output
  if (!Array.isArray(output)) return ''
  const chunks: string[] = []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
        chunks.push((part as { text: string }).text)
      }
    }
  }
  return chunks.join('')
}

function responseIdFrom(payload: Record<string, unknown>): string | null {
  const response = payload.response
  if (response && typeof response === 'object' && typeof (response as { id?: unknown }).id === 'string') {
    return (response as { id: string }).id
  }
  if (typeof payload.id === 'string' && payload.id.startsWith('resp_')) return payload.id
  return null
}

export function buildInput(session: Session): Message[] {
  const messages: Message[] = [{ role: 'system', content: session.system }]
  for (const turn of session.turns) {
    if (turn.role === 'user' || turn.role === 'assistant') {
      messages.push({ role: turn.role, content: turn.text })
    }
  }
  return messages
}

export async function* streamGrok(options: {
  apiKey: string
  model: string
  input: string | Message[]
  previousResponseId?: string | null
  search?: boolean
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  endpoint?: string
}): AsyncGenerator<StreamEvent> {
  if (!options.apiKey) {
    throw new GrokError('XAI_API_KEY ausente. Defina a chave no .env.')
  }

  const body: Record<string, unknown> = {
    model: options.model,
    stream: true,
    store: true,
    input: options.input,
  }
  if (options.previousResponseId) body.previous_response_id = options.previousResponseId
  if (options.search) {
    body.tools = [{ type: 'web_search' }, { type: 'x_search' }]
  }

  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(options.endpoint ?? ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!response.ok) {
    const raw = await response.text()
    throw new GrokError(errorMessage(raw, response.status), response.status)
  }
  if (!response.body) throw new GrokError('a API não devolveu um stream')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let responseId: string | null = options.previousResponseId ?? null

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    if (done && buffer.trim()) buffer += '\n\n'
    const parsed = pushSse(buffer, '')
    buffer = parsed.buffer

    for (const event of parsed.events) {
      if (event.data === '[DONE]') continue
      let payload: Record<string, unknown>
      try {
        payload = JSON.parse(event.data) as Record<string, unknown>
      } catch {
        continue
      }
      if (payload.error) {
        const message =
          typeof payload.error === 'string'
            ? payload.error
            : typeof (payload.error as { message?: unknown }).message === 'string'
              ? (payload.error as { message: string }).message
              : 'erro no stream do Grok'
        throw new GrokError(message)
      }
      const id = responseIdFrom(payload)
      if (id) responseId = id
      const type = typeof payload.type === 'string' ? payload.type : ''
      if (type === 'response.output_text.delta' && typeof payload.delta === 'string' && payload.delta) {
        text += payload.delta
        yield { kind: 'delta', text: payload.delta }
      }
      if (type === 'response.completed') {
        const responseBody = payload.response as Record<string, unknown> | undefined
        const full = textFromResponse(responseBody)
        if (!text && full) {
          text = full
          yield { kind: 'delta', text: full }
        }
      }
    }

    if (done) break
  }

  yield { kind: 'done', responseId, text }
}
