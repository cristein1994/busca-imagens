export type ToolCallInfo = {
  name: string
  args: string
  result: string
}

export type ChatTurn = {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools: ToolCallInfo[]
  status: string
  pending: boolean
  error: boolean
}

export type StreamEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; text: string }
  | { type: 'tool'; name: string; args: string; result: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type StatusPayload = {
  tor?: {
    ok: boolean
    isTor: boolean
    ip?: string
    error?: string
    host?: string
    port?: number
  }
  llm?: {
    ok: boolean
    model: string
    baseUrl: string
    provider: string
    error?: string
    models?: string[]
  }
}
