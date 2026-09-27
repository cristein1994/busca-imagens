export type SseEvent = {
  event: string
  data: string
}

export function pushSse(buffer: string, chunk: string): { buffer: string; events: SseEvent[] } {
  const text = buffer + chunk
  const parts = text.split(/\r?\n\r?\n/)
  const rest = parts.pop() ?? ''
  const events: SseEvent[] = []

  for (const part of parts) {
    if (!part.trim()) continue
    let event = 'message'
    const dataLines: string[] = []
    for (const line of part.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') })
  }

  return { buffer: rest, events }
}
