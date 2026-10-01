export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ServerEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; text: string }
  | { type: 'tool'; name: string; args: string; result: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
