import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { ApifyClient } from 'apify-client'

const PORT = Number(process.env.PORT ?? 3001)
const TOKEN = process.env.APIFY_TOKEN?.trim() ?? ''

const ACTORS = {
  profile: 'harvestapi/linkedin-profile-scraper',
  search: 'harvestapi/linkedin-profile-search',
  company: 'harvestapi/linkedin-company',
  jobs: 'curious_coder/linkedin-jobs-scraper',
} as const

type ScrapeMode = keyof typeof ACTORS

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

function client() {
  if (!TOKEN) {
    throw Object.assign(new Error('APIFY_TOKEN não configurado. Defina no arquivo .env'), {
      status: 503,
    })
  }
  return new ApifyClient({ token: TOKEN })
}

async function runActor(actorId: string, input: Record<string, unknown>, maxUsd = 0.25) {
  const apify = client()
  const run = await apify.actor(actorId).call(input, {
    waitSecs: 120,
    maxTotalChargeUsd: maxUsd,
  })
  const { items } = await apify.dataset(run.defaultDatasetId!).listItems({ limit: 500 })
  return {
    runId: run.id,
    status: run.status,
    datasetId: run.defaultDatasetId,
    itemCount: items.length,
    items,
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasToken: Boolean(TOKEN),
    actors: ACTORS,
  })
})

app.post('/api/scrape/:mode', async (req, res) => {
  const mode = req.params.mode as ScrapeMode
  if (!(mode in ACTORS)) {
    res.status(400).json({ error: `Modo inválido. Use: ${Object.keys(ACTORS).join(', ')}` })
    return
  }

  try {
    const input = buildInput(mode, req.body ?? {})
    const result = await runActor(ACTORS[mode], input)
    res.json({ mode, actor: ACTORS[mode], input, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao scrapar'
    const status = (err as { status?: number }).status ?? 500
    console.error(`[scrape/${mode}]`, message)
    res.status(status).json({ error: message })
  }
})

function clamp(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(max, Math.max(min, Math.floor(v)))
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function buildInput(mode: ScrapeMode, body: Record<string, unknown>): Record<string, unknown> {
  switch (mode) {
    case 'profile': {
      const queries = asStringArray(body.queries ?? body.urls ?? body.query)
      if (!queries.length) {
        throw Object.assign(new Error('Informe ao menos uma URL ou identificador de perfil'), {
          status: 400,
        })
      }
      return {
        profileScraperMode:
          body.profileScraperMode ?? 'Profile details no email ($4 per 1k)',
        queries: queries.slice(0, 25),
      }
    }
    case 'search': {
      const searchQuery = String(body.searchQuery ?? body.query ?? '').trim()
      if (!searchQuery) {
        throw Object.assign(new Error('Informe um termo de busca (cargo, skills, etc.)'), {
          status: 400,
        })
      }
      const locations = asStringArray(body.locations ?? body.location)
      return {
        profileScraperMode: body.profileScraperMode ?? 'Short',
        searchQuery,
        ...(locations.length ? { locations } : {}),
        maxItems: clamp(body.maxItems, 1, 50, 10),
      }
    }
    case 'company': {
      const companies = asStringArray(body.companies ?? body.urls ?? body.query)
      const searches = asStringArray(body.searches ?? body.search)
      if (!companies.length && !searches.length) {
        throw Object.assign(
          new Error('Informe URL(s) de empresa e/ou nome(s) para busca'),
          { status: 400 },
        )
      }
      return {
        ...(companies.length ? { companies: companies.slice(0, 25) } : {}),
        ...(searches.length ? { searches: searches.slice(0, 25) } : {}),
      }
    }
    case 'jobs': {
      const keywords = String(body.keywords ?? body.query ?? '').trim()
      const urls = asStringArray(body.urls)
      if (!keywords && !urls.length) {
        throw Object.assign(new Error('Informe keywords ou URL(s) de busca de vagas'), {
          status: 400,
        })
      }
      return {
        ...(keywords ? { keywords } : {}),
        ...(body.location ? { location: String(body.location) } : {}),
        ...(urls.length ? { urls } : {}),
        datePosted: body.datePosted ?? 'pastMonth',
        limitPerSource: clamp(body.limitPerSource ?? body.maxItems, 1, 50, 15),
        scrapeCompany: Boolean(body.scrapeCompany),
      }
    }
  }
}

app.listen(PORT, () => {
  console.log(`LinkedIn scrape API em http://localhost:${PORT}`)
  console.log(`APIFY_TOKEN: ${TOKEN ? 'ok' : 'AUSENTE — configure .env'}`)
})
