import type { EngineReport, MediaHit, SearchRequest, SearchResponse } from '../shared/contracts.ts'
import { buildDork } from '../shared/dork.ts'
import { isBlockedSearch } from '../shared/safety.ts'
import { ENGINES, searchTarget, type EngineDef, type EngineRun } from './engines.ts'
import type { RawHit } from './parse.ts'
import { detectTor } from './tor.ts'

export class SearchRejected extends Error {
  constructor() {
    super('Essa busca foi recusada.')
    this.name = 'SearchRejected'
  }
}

export async function runSearch(body: SearchRequest): Promise<SearchResponse> {
  const dork = buildDork(body).slice(0, 500)
  const blob = [body.query, dork, ...Object.values(body.dork)].join('\n')
  if (isBlockedSearch(blob, body.nsfw)) throw new SearchRejected()
  if (!dork) throw new Error('Digite um termo ou monte um dork.')

  const tor = await detectTor(false)
  const picked = new Set(body.engineIds ?? [])
  const engines = ENGINES.filter((engine) => picked.size === 0 || picked.has(engine.id))
  const ctx: EngineRun = {
    torProxy: tor.proxy,
    timeoutMs: 7000,
    query: dork,
    media: body.media,
    nsfw: body.nsfw,
  }
  const settled = await mapPool(engines, 6, (engine) => runEngine(engine, ctx, tor.ok))
  const seen = new Set<string>()
  const results: MediaHit[] = []
  for (const entry of settled) {
    for (const hit of entry.hits) {
      const key = `${hit.kind}|${hit.mediaUrl ?? hit.pageUrl}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push(hit)
      if (results.length >= 180) break
    }
    if (results.length >= 180) break
  }
  results.sort((a, b) => rank(a) - rank(b))
  return { dork, tor, engines: settled.map((entry) => entry.report), results }
}

function rank(hit: MediaHit): number {
  if (hit.kind === 'image' && hit.mediaUrl) return 0
  if (hit.kind === 'video' && (hit.embedUrl || hit.mediaUrl)) return 1
  if (hit.thumbUrl) return 2
  return 3
}

async function runEngine(
  engine: EngineDef,
  ctx: EngineRun,
  torOk: boolean,
): Promise<{ report: EngineReport; hits: MediaHit[] }> {
  const viaTor = engine.network === 'onion' && torOk && Boolean(engine.onion)
  const local: EngineRun = { ...ctx, timeoutMs: viaTor ? 18000 : 7000 }
  const searchUrl = searchTarget(engine, local, viaTor) ?? ''
  const started = Date.now()
  const via = engine.network === 'surface' ? 'direct' : viaTor ? 'tor' : 'clearnet-fallback'
  const reportBase = {
    id: engine.id,
    name: engine.name,
    network: engine.network,
    group: engine.group,
    searchUrl,
    via,
  } as const
  if (engine.network === 'onion' && !viaTor && !engine.clearnet) {
    return {
      report: {
        ...reportBase,
        ok: false,
        via: 'skipped',
        resultCount: 0,
        error: 'Precisa do Tor para abrir este .onion',
        elapsedMs: 0,
      },
      hits: [],
    }
  }
  try {
    const raw = await engine.run(local, searchUrl, viaTor)
    const hits = raw
      .filter((hit) => keepHit(hit, ctx))
      .map((hit) => toHit(engine, hit))
    return {
      report: {
        ...reportBase,
        ok: true,
        resultCount: hits.length,
        elapsedMs: Date.now() - started,
      },
      hits,
    }
  } catch (error) {
    return {
      report: {
        ...reportBase,
        ok: false,
        resultCount: 0,
        error: cleanError(error),
        elapsedMs: Date.now() - started,
      },
      hits: [],
    }
  }
}

function keepHit(hit: RawHit, ctx: EngineRun): boolean {
  if (ctx.media === 'image' && hit.kind === 'video') return false
  if (ctx.media === 'video' && hit.kind === 'image') return false
  const blob = [hit.title, hit.pageUrl, hit.mediaUrl ?? '', hit.snippet].join('\n')
  return !isBlockedSearch(blob, ctx.nsfw)
}

function toHit(engine: EngineDef, hit: RawHit): MediaHit {
  const key = `${engine.id}|${hit.mediaUrl ?? hit.pageUrl}|${hit.title}`
  return {
    id: hashId(key),
    title: hit.title,
    pageUrl: hit.pageUrl,
    mediaUrl: hit.mediaUrl,
    thumbUrl: hit.thumbUrl,
    embedUrl: hit.embedUrl,
    kind: hit.kind,
    engineId: engine.id,
    engineName: engine.name,
    network: engine.network,
    snippet: hit.snippet,
  }
}

function hashId(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash, 31) + value.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}

function cleanError(error: unknown): string {
  if (!(error instanceof Error)) return 'falha'
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'tempo esgotado'
  const message = error.message.replace(/\s+/g, ' ').slice(0, 180)
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(message)) return 'sem conexão'
  return message || 'falha'
}

async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const current = next
      next += 1
      if (current >= items.length) return
      results[current] = await fn(items[current]!)
    }
  })
  await Promise.all(workers)
  return results
}
