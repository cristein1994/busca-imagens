import { nowIso, type Session } from '../shared/types.ts'
import { saveSession } from './sessionStore.ts'
import { GrokError, buildInput, streamGrok, type StreamEvent } from './grok.ts'

export async function* runTurn(options: {
  root: string
  session: Session
  text: string
  apiKey: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  endpoint?: string
}): AsyncGenerator<StreamEvent> {
  const { session } = options
  session.turns.push({ role: 'user', text: options.text, at: nowIso() })

  const attempt = (usePrevious: boolean) =>
    streamGrok({
      apiKey: options.apiKey,
      model: session.model,
      input: usePrevious && session.previousResponseId ? options.text : buildInput(session),
      previousResponseId: usePrevious ? session.previousResponseId : null,
      search: session.search,
      signal: options.signal,
      fetchImpl: options.fetchImpl,
      endpoint: options.endpoint,
    })

  let assistant = ''
  let responseId: string | null = null
  let yielded = false

  const consume = async function* (usePrevious: boolean) {
    for await (const event of attempt(usePrevious)) {
      if (event.kind === 'delta') {
        yielded = true
        assistant += event.text
        yield event
      } else if (event.kind === 'done') {
        responseId = event.responseId
        if (!assistant && event.text) assistant = event.text
        yield event
      }
    }
  }

  try {
    yield* consume(true)
  } catch (error) {
    if (options.signal?.aborted) {
      session.turns.push({
        role: assistant ? 'assistant' : 'note',
        text: assistant || 'interrompido',
        at: nowIso(),
      })
      saveSession(options.root, session)
      return
    }
    if (!yielded && session.previousResponseId) {
      session.previousResponseId = null
      assistant = ''
      try {
        yield* consume(false)
      } catch (retryError) {
        const message = retryError instanceof Error ? retryError.message : 'falha ao falar com o Grok'
        session.turns.push({ role: 'note', text: message, at: nowIso() })
        saveSession(options.root, session)
        throw retryError
      }
    } else {
      const message = error instanceof Error ? error.message : 'falha ao falar com o Grok'
      session.turns.push({ role: 'note', text: message, at: nowIso() })
      saveSession(options.root, session)
      throw error instanceof Error ? error : new GrokError(message)
    }
  }

  session.turns.push({ role: 'assistant', text: assistant, at: nowIso() })
  if (responseId) session.previousResponseId = responseId
  saveSession(options.root, session)
}
