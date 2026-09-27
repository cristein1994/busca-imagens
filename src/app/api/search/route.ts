import { classify } from '@/lib/classify'
import { runSearch } from '@/lib/search'
import { QUERY_KINDS, type QueryKind, type SearchResponse } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const hits = new Map<string, number[]>()

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'local'
}

function limited(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < 60_000)
  if (recent.length >= 20) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  return false
}

export async function POST(request: Request) {
  if (limited(clientKey(request))) {
    return Response.json(
      { error: 'Muitas buscas seguidas. Espere um minuto e tente de novo.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const payload = body && typeof body === 'object' ? (body as { query?: unknown; kind?: unknown }) : {}
  if (typeof payload.query !== 'string') {
    return Response.json({ error: 'Informe um termo de busca.' }, { status: 400 })
  }
  const query = payload.query.trim()
  if (query.length < 2 || query.length > 180) {
    return Response.json({ error: 'Informe entre 2 e 180 caracteres.' }, { status: 400 })
  }
  if ([...query].some((char) => (char.codePointAt(0) ?? 0) <= 31)) {
    return Response.json({ error: 'O termo contém caracteres inválidos.' }, { status: 400 })
  }

  let forced: QueryKind | undefined
  if (payload.kind !== undefined) {
    if (typeof payload.kind !== 'string' || !QUERY_KINDS.includes(payload.kind as QueryKind)) {
      return Response.json({ error: 'Tipo de busca inválido.' }, { status: 400 })
    }
    forced = payload.kind as QueryKind
  }

  try {
    const classified = classify(query, forced)
    const started = Date.now()
    const modules = await runSearch(classified)
    const response: SearchResponse = {
      query,
      normalized: classified.normalized,
      kind: classified.kind,
      kindLabel: classified.kindLabel,
      tookMs: Date.now() - started,
      modules,
    }
    return Response.json(response, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível classificar a busca.'
    return Response.json({ error: message }, { status: 422 })
  }
}
