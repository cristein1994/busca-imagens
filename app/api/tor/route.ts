import { NextRequest, NextResponse } from 'next/server'
import { configureTor, torStatus } from '@/lib/tor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 180

function isLocal(request: NextRequest): boolean {
  const host = (request.headers.get('host') ?? '').split(':')[0]?.toLowerCase() ?? ''
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

export async function GET() {
  return NextResponse.json(await torStatus())
}

export async function POST(request: NextRequest) {
  if (!isLocal(request)) {
    return NextResponse.json({ error: 'Configurar o Tor só é permitido a partir de localhost.' }, { status: 403 })
  }
  const result = await configureTor()
  const status = await torStatus()
  return NextResponse.json({ ...result, status }, { status: result.ok ? 200 : 500 })
}
