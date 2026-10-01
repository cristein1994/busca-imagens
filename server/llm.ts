import { getLlmConfig, SYSTEM_PROMPT } from './config.ts'
import { TOOL_DEFINITIONS, runTool } from './tools.ts'
import type { ChatMessage, ToolCall } from './types.ts'

type StreamHandlers = {
  onToken: (text: string) => void
  onTool: (info: { name: string; args: string; result: string }) => void
  onStatus: (text: string) => void
}

type LlmMessage = ChatMessage & {
  reasoning?: string
  reasoning_content?: string
}

function stripThinking(text: string): string {
  if (!text) return ''
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  out = out.replace(/^[\s\S]*?<\/think>/i, '')
  out = out.replace(/<think>[\s\S]*$/i, '')
  return out.trim()
}

function visibleContent(msg: LlmMessage): string {
  const content = stripThinking(msg.content || '')
  if (content) return content
  const reasoning = msg.reasoning_content || msg.reasoning || ''
  const lines = reasoning
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return lines[lines.length - 1] || ''
}

async function chatOpenAiCompat(env: Record<string, string>, messages: ChatMessage[]) {
  const cfg = getLlmConfig(env)
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      stream: false,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LLM ${res.status}: ${errText.slice(0, 800)}`)
  }
  const data = (await res.json()) as {
    choices: Array<{
      message: LlmMessage & { tool_calls?: ToolCall[] }
    }>
  }
  const msg = data.choices?.[0]?.message
  if (!msg) throw new Error('empty LLM response')
  return {
    content: visibleContent(msg),
    tool_calls: msg.tool_calls || [],
  }
}

async function chatOllamaNative(env: Record<string, string>, messages: ChatMessage[]) {
  const cfg = getLlmConfig(env)
  const root = cfg.baseUrl.replace(/\/v1$/, '')
  const res = await fetch(`${root}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      tools: TOOL_DEFINITIONS.map((t) => t.function),
      stream: false,
      options: {
        temperature: 0.7,
        num_ctx: 8192,
        num_predict: 2048,
      },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ollama ${res.status}: ${errText.slice(0, 800)}`)
  }
  const data = (await res.json()) as {
    message?: LlmMessage & {
      tool_calls?: Array<{
        function: { name: string; arguments: Record<string, unknown> | string }
      }>
    }
  }
  const msg = data.message
  if (!msg) throw new Error('empty Ollama response')

  const tool_calls: ToolCall[] = (msg.tool_calls || []).map((tc, i) => {
    const args =
      typeof tc.function.arguments === 'string'
        ? tc.function.arguments
        : JSON.stringify(tc.function.arguments ?? {})
    return {
      id: `call_${Date.now()}_${i}`,
      type: 'function',
      function: { name: tc.function.name, arguments: args },
    }
  })

  return {
    content: visibleContent(msg),
    tool_calls,
  }
}

async function nonStreamOnce(env: Record<string, string>, messages: ChatMessage[]) {
  const cfg = getLlmConfig(env)
  if (cfg.provider === 'ollama') {
    try {
      return await chatOllamaNative(env, messages)
    } catch (e) {
      console.warn('ollama native failed, falling back', e)
    }
  }
  return chatOpenAiCompat(env, messages)
}

export async function runAgent(
  env: Record<string, string>,
  userMessages: ChatMessage[],
  handlers: StreamHandlers,
  maxRounds = 6,
): Promise<string> {
  const cfg = getLlmConfig(env)
  handlers.onStatus(`model=${cfg.model} provider=${cfg.provider}`)

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages.filter((m) => m.role !== 'system'),
  ]

  let finalText = ''

  for (let round = 0; round < maxRounds; round++) {
    handlers.onStatus(`round ${round + 1}/${maxRounds}`)
    const msg = await nonStreamOnce(env, messages)

    if (msg.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: msg.content || '',
        tool_calls: msg.tool_calls,
      })

      for (const call of msg.tool_calls) {
        handlers.onStatus(`tool ${call.function.name}`)
        const result = await runTool(env, call.function.name, call.function.arguments || '{}')
        handlers.onTool({
          name: call.function.name,
          args: call.function.arguments || '{}',
          result,
        })
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: result,
        })
      }
      continue
    }

    finalText = msg.content || ''
    if (!finalText) {
      finalText = '(resposta vazia — tente de novo com um prompt mais curto)'
    }
    const chunkSize = 28
    for (let i = 0; i < finalText.length; i += chunkSize) {
      handlers.onToken(finalText.slice(i, i + chunkSize))
    }
    return finalText
  }

  finalText = 'Limite do loop de tools. Narrow the question or check Tor/LLM.'
  handlers.onToken(finalText)
  return finalText
}

export async function probeLlm(env: Record<string, string>): Promise<{
  ok: boolean
  model: string
  baseUrl: string
  provider: string
  error?: string
  models?: string[]
}> {
  const cfg = getLlmConfig(env)
  try {
    if (cfg.provider === 'ollama') {
      const root = cfg.baseUrl.replace(/\/v1$/, '')
      const res = await fetch(`${root}/api/tags`, { method: 'GET' })
      if (res.ok) {
        const data = (await res.json()) as { models?: Array<{ name: string }> }
        const models = (data.models || []).map((m) => m.name)
        const present = models.some((n) => n === cfg.model || n.startsWith(`${cfg.model}:`))
        return {
          ok: present || models.length > 0,
          model: cfg.model,
          baseUrl: cfg.baseUrl,
          provider: cfg.provider,
          models,
          error: present
            ? undefined
            : models.length
              ? `modelo não puxado; disponíveis: ${models.slice(0, 8).join(', ')}`
              : 'nenhum modelo — rode: ollama pull llama3.2',
        }
      }
    }

    const mres = await fetch(`${cfg.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    })
    if (!mres.ok) {
      const text = await mres.text()
      return {
        ok: false,
        model: cfg.model,
        baseUrl: cfg.baseUrl,
        provider: cfg.provider,
        error: `models ${mres.status}: ${text.slice(0, 200)}`,
      }
    }
    return {
      ok: true,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      provider: cfg.provider,
    }
  } catch (e) {
    return {
      ok: false,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      provider: cfg.provider,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
