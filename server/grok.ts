export const DEFAULT_MODEL = 'grok-4.7'
export const MAX_MESSAGES = 16
export const MAX_CONTENT_LENGTH = 2000

const XAI_CHAT_URL = 'https://api.x.ai/v1/chat/completions'
const REQUEST_TIMEOUT_MS = 45_000

const PLACEHOLDER_KEYS = new Set([
  '',
  'sua_api_key_aqui',
  'your_api_key',
  'your_api_key_here',
])

const SYSTEM_PROMPT = [
  'Você é o Grok, assistente da aplicação Busca Imagens.',
  'Ajude a pessoa a encontrar fotos no Unsplash.',
  'Responda sempre em português, em no máximo duas frases.',
  'Quando a pessoa descrever algo que possa virar foto, chame a ferramenta search_images com uma consulta curta (em inglês se isso trouxer fotos melhores) e diga o que você vai buscar.',
  'Não invente links de imagem e não peça chaves de API.',
  'Se a mensagem não for sobre imagens, responda em uma frase e convide a pessoa a descrever uma foto.',
].join(' ')

const SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'search_images',
    description: 'Busca fotos no Unsplash para a consulta informada.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Termos curtos de busca, sem pontuação extra.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
} as const

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GrokConfig {
  configured: boolean
  apiKey?: string
  model: string
}

export interface GrokResult {
  reply: string
  searchQuery: string | null
}

export class GrokError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'GrokError'
    this.status = status
  }
}

export function resolveGrokConfig(env: {
  XAI_API_KEY?: string
  GROK_MODEL?: string
}): GrokConfig {
  const apiKey = (env.XAI_API_KEY ?? '').trim()
  const configured = apiKey.length > 0 && !PLACEHOLDER_KEYS.has(apiKey.toLowerCase())
  let model = (env.GROK_MODEL ?? '').trim() || DEFAULT_MODEL
  if (!/^[A-Za-z0-9._:-]{1,64}$/.test(model)) {
    model = DEFAULT_MODEL
  }
  return {
    configured,
    apiKey: configured ? apiKey : undefined,
    model,
  }
}

export function sanitizeMessages(
  input: unknown,
): { ok: true; messages: ChatMessage[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'Envie uma lista de mensagens.' }
  }

  const cleaned: ChatMessage[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof content !== 'string') continue
    const text = content.trim().slice(0, MAX_CONTENT_LENGTH)
    if (!text) continue
    cleaned.push({ role, content: text })
  }

  const recent = cleaned.slice(-MAX_MESSAGES)
  while (recent[0]?.role === 'assistant') {
    recent.shift()
  }

  if (recent.length === 0 || recent[recent.length - 1]?.role !== 'user') {
    return { ok: false, error: 'A última mensagem precisa ser do usuário.' }
  }

  return { ok: true, messages: recent }
}

export function parseCompletion(payload: unknown): GrokResult {
  if (!payload || typeof payload !== 'object') {
    throw new GrokError(502, 'Resposta inválida do Grok.')
  }

  const choices = (payload as { choices?: unknown }).choices
  const first = Array.isArray(choices) ? choices[0] : undefined
  const message =
    first && typeof first === 'object'
      ? (first as { message?: unknown }).message
      : undefined

  if (!message || typeof message !== 'object') {
    throw new GrokError(502, 'O Grok não retornou uma resposta.')
  }

  const replyText = textFromContent((message as { content?: unknown }).content)
  const searchQuery = searchQueryFromMessage(message)
  const reply = replyText || (searchQuery ? `Buscando fotos para “${searchQuery}”.` : '')

  if (!reply) {
    throw new GrokError(502, 'O Grok não retornou uma resposta.')
  }

  return { reply, searchQuery }
}

export async function askGrok(options: {
  config: GrokConfig
  messages: ChatMessage[]
  fetchImpl?: typeof fetch
}): Promise<GrokResult> {
  const { config, messages } = options
  if (!config.configured || !config.apiKey) {
    throw new GrokError(503, 'Chave XAI_API_KEY não configurada no servidor.')
  }

  const fetchImpl = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(XAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        reasoning_effort: 'low',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        tools: [SEARCH_TOOL],
        tool_choice: 'auto',
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    if (isTimeout(err)) {
      throw new GrokError(504, 'O Grok demorou para responder. Tente de novo.')
    }
    throw new GrokError(502, 'Não foi possível conectar ao Grok.')
  }

  if (!response.ok) {
    const upstream = await readUpstreamError(response)
    if (response.status === 401 || response.status === 403) {
      throw new GrokError(
        502,
        'A chave XAI_API_KEY foi recusada. Confira o valor no arquivo .env.',
      )
    }
    if (response.status === 429) {
      throw new GrokError(502, 'Limite de requisições do Grok atingido. Tente novamente em instantes.')
    }
    throw new GrokError(502, publicError(upstream, config.apiKey))
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new GrokError(502, 'Resposta inválida do Grok.')
  }

  return parseCompletion(payload)
}

export async function handleGrokRequest(input: {
  method: string | undefined
  body?: string
  config: GrokConfig
  fetchImpl?: typeof fetch
}): Promise<{ status: number; body: unknown }> {
  const method = (input.method ?? 'GET').toUpperCase()

  if (method === 'GET') {
    return {
      status: 200,
      body: { configured: input.config.configured, model: input.config.model },
    }
  }

  if (method !== 'POST') {
    return { status: 405, body: { error: 'Método não permitido.' } }
  }

  if (!input.config.configured) {
    return {
      status: 503,
      body: { error: 'Chave XAI_API_KEY não configurada no servidor.' },
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.body ?? '')
  } catch {
    return { status: 400, body: { error: 'JSON inválido.' } }
  }

  const messages = parsed && typeof parsed === 'object'
    ? (parsed as { messages?: unknown }).messages
    : undefined
  const sanitized = sanitizeMessages(messages)
  if (!sanitized.ok) {
    return { status: 400, body: { error: sanitized.error } }
  }

  try {
    const result = await askGrok({
      config: input.config,
      messages: sanitized.messages,
      fetchImpl: input.fetchImpl,
    })
    return { status: 200, body: result }
  } catch (err) {
    if (err instanceof GrokError) {
      return { status: err.status, body: { error: err.message } }
    }
    return { status: 502, body: { error: 'Não foi possível conectar ao Grok.' } }
  }
}

function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
        return part.text
      }
      return ''
    })
    .join('')
    .trim()
}

function searchQueryFromMessage(message: object): string | null {
  const calls = (message as { tool_calls?: unknown }).tool_calls
  if (!Array.isArray(calls)) return null

  for (const call of calls) {
    if (!call || typeof call !== 'object') continue
    const fn = (call as { function?: { name?: unknown; arguments?: unknown } }).function
    if (!fn || fn.name !== 'search_images') continue

    let args: unknown = fn.arguments
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args)
      } catch {
        continue
      }
    }

    if (!args || typeof args !== 'object' || !('query' in args)) continue
    const query = (args as { query?: unknown }).query
    if (typeof query !== 'string') continue
    const trimmed = query.trim().slice(0, 120)
    if (trimmed) return trimmed
  }

  return null
}

async function readUpstreamError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: unknown } | string }
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim()
    if (
      data.error &&
      typeof data.error === 'object' &&
      typeof data.error.message === 'string' &&
      data.error.message.trim()
    ) {
      return data.error.message.trim()
    }
  } catch {
    // Fall through to the status fallback.
  }
  return `Erro do Grok (${response.status}).`
}

function publicError(message: string, apiKey: string): string {
  const cleaned = message.replaceAll(apiKey, '').replace(/\s+/g, ' ').trim().slice(0, 280)
  return cleaned || 'Erro ao falar com o Grok.'
}

function isTimeout(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'name' in err &&
    (err.name === 'TimeoutError' || err.name === 'AbortError')
  )
}
