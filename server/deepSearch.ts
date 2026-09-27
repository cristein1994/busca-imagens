import { completeText, sanitizeModel, streamChat } from './deepseek.ts'
import type { ServerEvent, Source } from './types.ts'
import { expandQueries, rankSources, readPage, searchWeb } from './web.ts'

export async function runDeepSearch(options: {
  query: string
  model: string
  system: string
  temperature: number
  apiKey: string
  baseUrl: string
  signal: AbortSignal
  emit: (event: ServerEvent) => void
}): Promise<void> {
  const query = options.query.trim().slice(0, 500)
  if (!query) {
    options.emit({ type: 'error', message: 'Escreva o que você quer pesquisar.' })
    return
  }

  options.emit({ type: 'status', message: 'Montando as consultas' })
  const planned = await planQueries(query, options).catch(() => [] as string[])
  const queries = uniqueText([...expandQueries(query), ...planned]).slice(0, 4)
  options.emit({ type: 'queries', queries })

  options.emit({ type: 'status', message: 'Buscando na web' })
  const found: Source[] = []
  for (const item of queries) {
    if (options.signal.aborted) return
    const batch = await searchWeb(item, 5).catch(() => [] as Source[])
    found.push(...batch)
  }
  const sources = rankSources(query, uniqueSources(found), 6)
  if (sources.length === 0) {
    options.emit({
      type: 'error',
      message: 'A busca web não trouxe páginas para essa consulta.',
    })
    return
  }

  options.emit({ type: 'status', message: 'Lendo as páginas' })
  const pages = await readSources(sources, options.signal)
  options.emit({ type: 'sources', sources: pages })

  if (!options.apiKey) {
    options.emit({
      type: 'error',
      message: 'As páginas foram encontradas. Defina DEEPSEEK_API_KEY no .env para a DeepSeek escrever a resposta.',
    })
    options.emit({ type: 'done' })
    return
  }

  options.emit({ type: 'status', message: 'Escrevendo a resposta' })
  const model = sanitizeModel(options.model)
  await streamChat({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    model,
    temperature: options.temperature,
    system: options.system,
    messages: [{ role: 'user', content: synthesisPrompt(query, queries, pages) }],
    signal: options.signal,
    onDelta: (delta) => {
      if (delta.reasoning) options.emit({ type: 'reasoning', content: delta.reasoning })
      if (delta.content) options.emit({ type: 'delta', content: delta.content })
    },
  })
  options.emit({ type: 'done' })
}

async function planQueries(
  query: string,
  options: { apiKey: string; baseUrl: string; signal: AbortSignal },
): Promise<string[]> {
  if (!options.apiKey) return [query]
  const raw = await completeText({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    signal: options.signal,
    system:
      'Gere consultas curtas de busca web. Responda apenas JSON no formato {"queries":["..."]}.',
    user: `Pergunta: ${query}`,
  })
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return [query]
  const parsed: unknown = JSON.parse(match[0])
  if (!parsed || typeof parsed !== 'object') return [query]
  const list = (parsed as { queries?: unknown }).queries
  if (!Array.isArray(list)) return [query]
  const queries = list
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 2 && item.length <= 140)
    .slice(0, 4)
  return queries.length > 0 ? queries : [query]
}

async function readSources(sources: Source[], signal: AbortSignal): Promise<Source[]> {
  const pages = await Promise.all(
    sources.map(async (source) => {
      if (signal.aborted) return source
      try {
        const page = await readPage(source.url)
        return {
          ...source,
          title: page.title || source.title,
          url: page.url,
          snippet: source.snippet || page.excerpt,
          content: page.content,
        }
      } catch {
        return source
      }
    }),
  )
  return pages
}

function synthesisPrompt(query: string, queries: string[], sources: Source[]): string {
  let budget = 24_000
  const blocks = sources.map((source, index) => {
    const body = (source.content || source.snippet || '').slice(0, Math.max(0, budget))
    budget -= body.length
    return `[${index + 1}] ${source.title}\n${source.url}\n${body}`
  })
  return [
    `Pergunta: ${query}`,
    '',
    'Consultas de busca:',
    ...queries.map((item) => `- ${item}`),
    '',
    'Páginas lidas:',
    ...blocks,
    '',
    'Responda no idioma da pergunta, de forma direta. Cite a URL de cada fonte que usar. Se pedirem código, inclua o código. Se as páginas não cobrirem o pedido, diga o que ficou em aberto.',
  ].join('\n')
}

function uniqueText(values: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const value of values) {
    const key = value.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(value)
  }
  return unique
}

function uniqueSources(sources: Source[]): Source[] {
  const seen = new Set<string>()
  const unique: Source[] = []
  for (const source of sources) {
    if (seen.has(source.url)) continue
    seen.add(source.url)
    unique.push(source)
  }
  return unique
}
