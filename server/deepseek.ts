import type { ChatMessage } from './types.ts'

const OFFICIAL_BASE = 'https://api.deepseek.com'

export type DeltaHandler = (delta: { content?: string; reasoning?: string }) => void

export function resolveBaseUrl(value: string | undefined): string {
  const raw = (value ?? '').trim().replace(/\/$/, '')
  if (!raw) return OFFICIAL_BASE
  try {
    const url = new URL(raw)
    if (url.protocol === 'https:' && url.hostname === 'api.deepseek.com') {
      return raw.replace(/\/v1$/, '')
    }
  } catch {
    // usa o endereço oficial
  }
  return OFFICIAL_BASE
}

export function sanitizeModel(value: unknown): string {
  if (value === 'deepseek-reasoner' || value === 'deepseek-chat') return value
  return 'deepseek-chat'
}

export async function streamChat(options: {
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  system: string
  messages: ChatMessage[]
  signal: AbortSignal
  onDelta: DeltaHandler
}): Promise<void> {
  const messages = buildMessages(options.system, options.messages)
  const body: Record<string, unknown> = {
    model: options.model,
    messages,
    stream: true,
  }
  if (options.model !== 'deepseek-reasoner') {
    body.temperature = options.temperature
  }

  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: 'POST',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }
  if (!response.body) throw new Error('A API DeepSeek não devolveu resposta.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      const delta = parseDelta(data)
      if (delta.content || delta.reasoning) options.onDelta(delta)
    }
  }
}

export async function completeText(options: {
  apiKey: string
  baseUrl: string
  system: string
  user: string
  signal: AbortSignal
}): Promise<string> {
  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: 'POST',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
    }),
  })

  if (!response.ok) throw new Error(await readApiError(response))
  const payload: unknown = await response.json()
  const content = readContent(payload)
  if (!content) throw new Error('A API DeepSeek devolveu uma resposta vazia.')
  return content
}

function buildMessages(system: string, messages: ChatMessage[]) {
  const recent = messages
    .filter((message) => message.content.trim())
    .slice(-30)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 20_000),
    }))
  if (!system.trim()) return recent
  return [{ role: 'system', content: system.slice(0, 8_000) }, ...recent]
}

function parseDelta(data: string): { content?: string; reasoning?: string } {
  try {
    const json: unknown = JSON.parse(data)
    if (!json || typeof json !== 'object') return {}
    const choices = (json as { choices?: unknown }).choices
    if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return {}
    const delta = (choices[0] as { delta?: unknown }).delta
    if (!delta || typeof delta !== 'object') return {}
    const record = delta as { content?: unknown; reasoning_content?: unknown }
    const content = typeof record.content === 'string' ? record.content : undefined
    const reasoning =
      typeof record.reasoning_content === 'string' ? record.reasoning_content : undefined
    return { content, reasoning }
  } catch {
    return {}
  }
}

function readContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return ''
  const message = (choices[0] as { message?: unknown }).message
  if (!message || typeof message !== 'object') return ''
  const content = (message as { content?: unknown }).content
  return typeof content === 'string' ? content : ''
}

async function readApiError(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const json: unknown = JSON.parse(text)
    if (json && typeof json === 'object') {
      const error = (json as { error?: unknown }).error
      if (error && typeof error === 'object') {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.trim()) return humanizeApiError(message)
      }
      const message = (json as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) return message.slice(0, 400)
    }
  } catch {
    // corpo não é JSON
  }
  if (response.status === 401) return 'A chave da API DeepSeek foi recusada.'
  if (response.status === 402) return 'A conta DeepSeek está sem saldo.'
  return `A API DeepSeek respondeu ${response.status}.`
}

function humanizeApiError(message: string): string {
  if (/insufficient balance/i.test(message)) {
    return 'A conta DeepSeek está sem saldo.'
  }
  return message.slice(0, 400)
}
