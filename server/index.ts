import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { ApifyClient } from 'apify-client'

const PORT = Number(process.env.PORT ?? 3001)
const TOKEN = process.env.APIFY_TOKEN?.trim() ?? ''

const ACTORS = {
  contacts: 'dev_fusion + harvestapi email + x_guru phone',
  profile: 'harvestapi/linkedin-profile-scraper',
  search: 'harvestapi/linkedin-profile-search',
  company: 'harvestapi/linkedin-company',
  jobs: 'curious_coder/linkedin-jobs-scraper',
} as const

const PROFILE_ACTOR = 'harvestapi/linkedin-profile-scraper'
const SEARCH_ACTOR = 'harvestapi/linkedin-profile-search'
const PHONE_ACTOR = 'x_guru/linkedin-phone-Scraper-no-cookies'
const DEV_FUSION_ACTOR = 'dev_fusion/Linkedin-Profile-Scraper'

const PROFILE_EMAIL_MODE = 'Profile details + email search ($10 per 1k)'
const PROFILE_NO_EMAIL_MODE = 'Profile details no email ($4 per 1k)'
const SEARCH_EMAIL_MODE = 'Full + email search'

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

async function runActor(actorId: string, input: Record<string, unknown>, maxUsd = 0.35) {
  const apify = client()
  const run = await apify.actor(actorId).call(input, {
    waitSecs: 180,
    maxTotalChargeUsd: maxUsd,
  })
  const { items } = await apify.dataset(run.defaultDatasetId!).listItems({ limit: 500 })
  return {
    runId: run.id,
    status: run.status ?? 'UNKNOWN',
    datasetId: run.defaultDatasetId,
    itemCount: items.length,
    items: items as Record<string, unknown>[],
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
    const body = (req.body ?? {}) as Record<string, unknown>
    if (mode === 'contacts') {
      const result = await scrapeContacts(body)
      res.json(result)
      return
    }

    const input = buildInput(mode, body)
    const actor = ACTORS[mode]
    const result = await runActor(actor, input)
    const items =
      mode === 'profile' || mode === 'search'
        ? normalizePeople(result.items, { withPhone: false })
        : result.items

    res.json({
      mode,
      actor,
      input,
      ...result,
      itemCount: items.length,
      items,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao scrapar'
    const status = (err as { status?: number }).status ?? 500
    console.error(`[scrape/${mode}]`, message)
    res.status(status).json({ error: message })
  }
})

async function scrapeContacts(body: Record<string, unknown>) {
  const includeEmail = body.includeEmail !== false
  const includePhone = body.includePhone !== false
  const onlyWithEmail = Boolean(body.onlyWithEmail)
  const onlyWithPhone = Boolean(body.onlyWithPhone)
  const maxItems = clamp(body.maxItems, 1, 25, 10)

  const queries = asStringArray(body.queries ?? body.urls ?? body.query)
  const searchQuery = String(body.searchQuery ?? '').trim()
  const locations = asStringArray(body.locations ?? body.location)

  if (!queries.length && !searchQuery) {
    throw Object.assign(
      new Error('Informe URLs de perfil e/ou um termo de busca de pessoas'),
      { status: 400 },
    )
  }

  const runIds: string[] = []
  let people: Record<string, unknown>[] = []
  let primaryActor = PROFILE_ACTOR
  let input: Record<string, unknown> = {}

  if (queries.length) {
    input = {
      profileScraperMode: includeEmail ? PROFILE_EMAIL_MODE : PROFILE_NO_EMAIL_MODE,
      queries: queries.slice(0, maxItems),
    }
    primaryActor = PROFILE_ACTOR
    const profileRun = await runActor(PROFILE_ACTOR, input, 0.4)
    runIds.push(profileRun.runId)
    people = profileRun.items

    // Optional dual enrich (needs Actor permission in Apify console)
    if (includePhone) {
      try {
        const fusionRun = await runActor(
          DEV_FUSION_ACTOR,
          {
            profileUrls: queries.slice(0, Math.min(maxItems, 10)).map(toProfileUrl),
          },
          0.15,
        )
        runIds.push(fusionRun.runId)
        people = mergeByUrl(people, fusionRun.items)
      } catch (err) {
        console.warn('[contacts/dev_fusion]', err instanceof Error ? err.message : err)
      }
    }
  } else {
    input = {
      profileScraperMode: includeEmail ? SEARCH_EMAIL_MODE : 'Full',
      searchQuery,
      ...(locations.length ? { locations } : {}),
      maxItems,
    }
    primaryActor = SEARCH_ACTOR
    const searchRun = await runActor(SEARCH_ACTOR, input, 0.45)
    runIds.push(searchRun.runId)
    people = searchRun.items
  }

  let phoneMap = new Map<string, string>()
  if (includePhone) {
    for (const item of people) {
      const url = pickUrl(item)
      const phone = pickPhone(item)
      if (url && phone) phoneMap.set(normalizeUrl(url), phone)
    }

    const needPhone = collectLinkedInUrls(people).filter((u) => !phoneMap.has(normalizeUrl(u)))
    if (needPhone.length) {
      try {
        const phoneRun = await runActor(
          PHONE_ACTOR,
          { linkedinUrls: needPhone.slice(0, maxItems), onlyWithPhones: false },
          0.15,
        )
        runIds.push(phoneRun.runId)
        for (const [k, v] of buildPhoneMap(phoneRun.items)) phoneMap.set(k, v)
      } catch (err) {
        console.warn('[contacts/phone]', err instanceof Error ? err.message : err)
      }
    }
  }

  let items = normalizePeople(people, {
    withPhone: includePhone,
    phoneMap,
  })

  if (onlyWithEmail) items = items.filter((row) => Boolean(row.email))
  if (onlyWithPhone) items = items.filter((row) => Boolean(row.phone))

  return {
    mode: 'contacts' as const,
    actor: includePhone ? ACTORS.contacts : primaryActor,
    input: {
      ...input,
      includeEmail,
      includePhone,
      onlyWithEmail,
      onlyWithPhone,
    },
    runId: runIds.join('+'),
    status: 'SUCCEEDED',
    itemCount: items.length,
    items,
    enrichments: {
      email: includeEmail,
      phone: includePhone,
      phoneMatches: phoneMap.size,
    },
  }
}

function toProfileUrl(value: string): string {
  const v = value.trim()
  if (v.includes('linkedin.com/')) return v
  return `https://www.linkedin.com/in/${v.replace(/^\/+/, '')}`
}

function mergeByUrl(
  base: Record<string, unknown>[],
  extra: Record<string, unknown>[],
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>()
  for (const item of base) {
    const url = pickUrl(item)
    if (url) map.set(normalizeUrl(url), item)
  }
  for (const item of extra) {
    const url = pickUrl(item)
    if (!url) continue
    const key = normalizeUrl(url)
    const prev = map.get(key) ?? {}
    map.set(key, { ...prev, ...item })
  }
  return Array.from(map.values())
}

function normalizePeople(
  items: Record<string, unknown>[],
  opts: { withPhone: boolean; phoneMap?: Map<string, string> },
) {
  return items.map((raw) => {
    const linkedinUrl = pickUrl(raw)
    const email = pickEmail(raw)
    const phoneFromMap = linkedinUrl
      ? opts.phoneMap?.get(normalizeUrl(linkedinUrl))
      : undefined
    const phone = phoneFromMap || pickPhone(raw) || null

    const fullName =
      String(raw.fullName ?? raw.name ?? '').trim() ||
      [raw.firstName, raw.lastName].filter(Boolean).map(String).join(' ').trim() ||
      null

    return {
      fullName,
      firstName: raw.firstName ?? null,
      lastName: raw.lastName ?? null,
      headline: raw.headline ?? raw.title ?? raw.jobTitle ?? null,
      companyName:
        raw.companyName ??
        (raw.company as { name?: string } | undefined)?.name ??
        raw.currentCompany ??
        null,
      location: raw.location ?? raw.geoLocation ?? null,
      linkedinUrl,
      email,
      phone: opts.withPhone ? phone : phone || null,
      emails: raw.emails ?? null,
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
    }
  })
}

function pickEmail(raw: Record<string, unknown>): string | null {
  if (typeof raw.email === 'string' && raw.email.includes('@')) return raw.email.trim()
  const emails = raw.emails
  if (Array.isArray(emails) && emails.length) {
    const first = emails[0]
    if (typeof first === 'string' && first.includes('@')) return first.trim()
    if (first && typeof first === 'object' && 'email' in first) {
      const e = String((first as { email: unknown }).email ?? '')
      if (e.includes('@')) return e.trim()
    }
  }
  return null
}

function pickPhone(raw: Record<string, unknown>): string | null {
  const candidates = [
    raw.phone,
    raw.mobileNumber,
    raw.mobile_phone,
    raw.mobilePhone,
    raw.telephone,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return null
}

function pickUrl(raw: Record<string, unknown>): string | null {
  const candidates = [
    raw.linkedinUrl,
    raw.linkedInUrl,
    raw.profileUrl,
    raw.url,
    raw.linkedin_url,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.includes('linkedin.com')) return c.trim()
  }
  if (typeof raw.publicIdentifier === 'string' && raw.publicIdentifier.trim()) {
    return `https://www.linkedin.com/in/${raw.publicIdentifier.trim()}`
  }
  return null
}

function collectLinkedInUrls(items: Record<string, unknown>[]): string[] {
  const urls = new Set<string>()
  for (const item of items) {
    const url = pickUrl(item)
    if (url) urls.add(url)
  }
  return Array.from(urls)
}

function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .split('?')[0]
}

function buildPhoneMap(items: Record<string, unknown>[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of items) {
    const url = pickUrl(item)
    const phone = pickPhone(item)
    if (url && phone) map.set(normalizeUrl(url), phone)
  }
  return map
}

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

function buildInput(mode: Exclude<ScrapeMode, 'contacts'>, body: Record<string, unknown>) {
  switch (mode) {
    case 'profile': {
      const queries = asStringArray(body.queries ?? body.urls ?? body.query)
      if (!queries.length) {
        throw Object.assign(new Error('Informe ao menos uma URL ou identificador de perfil'), {
          status: 400,
        })
      }
      const wantEmail = body.includeEmail === true || body.profileScraperMode === PROFILE_EMAIL_MODE
      return {
        profileScraperMode:
          body.profileScraperMode ??
          (wantEmail ? PROFILE_EMAIL_MODE : PROFILE_NO_EMAIL_MODE),
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
      const wantEmail =
        body.includeEmail === true || body.profileScraperMode === SEARCH_EMAIL_MODE
      return {
        profileScraperMode:
          body.profileScraperMode ?? (wantEmail ? SEARCH_EMAIL_MODE : 'Short'),
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
