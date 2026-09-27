import { NextRequest, NextResponse } from 'next/server'
import { searchDark } from '@/lib/dark'
import { rejectQuery } from '@/lib/guard'
import { searchSurface } from '@/lib/surface'
import { torStatus } from '@/lib/tor'
import type { Lane, LaneFailure, LaneReport } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

function failure(lane: 'surface' | 'dark', error: unknown): LaneFailure {
  return {
    ok: false,
    lane,
    error: error instanceof Error ? error.message : 'Falha inesperada na raspagem.',
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { query?: unknown; lane?: unknown } | null
  const query = String(body?.query ?? '').trim().replace(/\s+/g, ' ')
  const lane: Lane = body?.lane === 'surface' || body?.lane === 'dark' ? body.lane : 'both'

  if (query.length < 2 || query.length > 160) {
    return NextResponse.json({ error: 'A consulta precisa ter entre 2 e 160 caracteres.' }, { status: 400 })
  }

  const rejected = rejectQuery(query)
  if (rejected) {
    return NextResponse.json({ error: rejected }, { status: 400 })
  }

  const jobs: Promise<LaneReport | LaneFailure>[] = []
  if (lane === 'surface' || lane === 'both') {
    jobs.push(searchSurface(query).catch((error: unknown) => failure('surface', error)))
  }
  if (lane === 'dark' || lane === 'both') {
    jobs.push(searchDark(query).catch((error: unknown) => failure('dark', error)))
  }

  const settled = await Promise.all(jobs)
  const surface = settled.find((item) => item.lane === 'surface') ?? null
  const dark = settled.find((item) => item.lane === 'dark') ?? null

  return NextResponse.json({
    query,
    lane,
    fetchedAt: new Date().toISOString(),
    tor: await torStatus(),
    surface,
    dark,
  })
}
