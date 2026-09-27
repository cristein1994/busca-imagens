export interface GrokChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GrokReply {
  reply: string
  searchQuery: string | null
}

export interface GrokStatus {
  configured: boolean
  model: string
}

export async function fetchGrokStatus(): Promise<GrokStatus> {
  const response = await fetch('/api/grok')
  if (!response.ok) {
    throw new Error('Não foi possível verificar o Grok.')
  }
  const data = (await response.json()) as Partial<GrokStatus>
  return {
    configured: Boolean(data.configured),
    model: typeof data.model === 'string' && data.model.trim() ? data.model : 'grok-4.7',
  }
}

export async function sendGrokMessage(messages: GrokChatMessage[]): Promise<GrokReply> {
  const response = await fetch('/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  let data: { error?: unknown; reply?: unknown; searchQuery?: unknown } = {}
  try {
    data = (await response.json()) as typeof data
  } catch {
    data = {}
  }

  if (!response.ok) {
    throw new Error(typeof data.error === 'string' && data.error.trim() ? data.error : 'Erro ao falar com o Grok.')
  }
  if (typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new Error('Resposta inválida do Grok.')
  }

  const searchQuery =
    typeof data.searchQuery === 'string' && data.searchQuery.trim()
      ? data.searchQuery.trim()
      : null

  return { reply: data.reply.trim(), searchQuery }
}
