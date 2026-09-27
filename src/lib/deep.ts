import { friendlyError, requestPublic } from './net'
import { clip, plain } from './text'

export type DeepHit = {
  source: string
  group: string
  title: string
  snippet: string
  url: string
}

export type DeepReport = {
  name: string
  group: string
  status: 'ok' | 'empty' | 'error'
  count: number
  error?: string
}

type Hit = { title: string; url: string; snippet: string }

type Source = {
  id: string
  name: string
  group: 'Fórum' | 'Dados' | 'Código' | 'Mídia'
  request: (query: string) => { url: string; headers?: HeadersInit }
  parse: (data: unknown) => Hit[]
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

function textOf(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return plain(String(value))
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).slice(0, 2).join(' · ')
  const item = record(value)
  if (!item) return ''
  const preferred = item.en ?? item.pt ?? item['en-US'] ?? item.und
  if (preferred) return textOf(preferred)
  const first = Object.values(item)[0]
  return first ? textOf(first) : ''
}

function absUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`
  return url
}

function take(hits: Hit[], limit = 3): Hit[] {
  const seen = new Set<string>()
  const out: Hit[] = []
  for (const hit of hits) {
    const title = clip(hit.title, 140)
    const url = absUrl(hit.url)
    if (!title || !/^https?:\/\//i.test(url) || seen.has(url)) continue
    seen.add(url)
    out.push({ title, url, snippet: clip(hit.snippet || '—', 180) })
    if (out.length >= limit) break
  }
  return out
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stack(site: string, name: string): Source {
  return {
    id: `se-${site}`,
    name,
    group: 'Fórum',
    request: (query) => ({
      url: `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=${site}&pagesize=3`,
    }),
    parse: (data) => {
      const body = record(data)
      if (str(body?.error_message)) throw new Error(str(body?.error_message))
      return list(body?.items).flatMap((item) => {
        const row = record(item)
        const tags = list(row?.tags).map(str).filter(Boolean).join(', ')
        return [{ title: str(row?.title), url: str(row?.link), snippet: tags }]
      })
    },
  }
}

function wiki(host: string, name: string, group: Source['group']): Source {
  return {
    id: host,
    name,
    group,
    request: (query) => ({
      url: `https://${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&srlimit=3`,
    }),
    parse: (data) => list(record(record(data)?.query)?.search).flatMap((item) => {
      const row = record(item)
      const title = str(row?.title)
      if (!title) return []
      return [{
        title,
        url: `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
        snippet: str(row?.snippet),
      }]
    }),
  }
}

const SOURCES: Source[] = [
  {
    id: 'hn',
    name: 'Hacker News',
    group: 'Fórum',
    request: (query) => ({
      url: `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=3&tags=story`,
    }),
    parse: (data) => list(record(data)?.hits).flatMap((item) => {
      const row = record(item)
      const title = str(row?.title)
      const id = str(row?.objectID)
      const url = str(row?.url) || (id ? `https://news.ycombinator.com/item?id=${id}` : '')
      return [{ title, url, snippet: str(row?.author) }]
    }),
  },
  stack('stackoverflow', 'Stack Overflow'),
  stack('security', 'Information Security'),
  stack('serverfault', 'Server Fault'),
  stack('superuser', 'Super User'),
  stack('askubuntu', 'Ask Ubuntu'),
  stack('unix', 'Unix & Linux'),
  stack('softwareengineering', 'Software Engineering'),
  {
    id: 'lemmy',
    name: 'Lemmy',
    group: 'Fórum',
    request: (query) => ({
      url: `https://lemmy.world/api/v3/search?q=${encodeURIComponent(query)}&type_=Posts&limit=3`,
    }),
    parse: (data) => list(record(data)?.posts).flatMap((item) => {
      const post = record(record(item)?.post)
      return [{ title: str(post?.name), url: str(post?.ap_id), snippet: str(post?.body) }]
    }),
  },
  {
    id: 'discourse',
    name: 'Discourse Meta',
    group: 'Fórum',
    request: (query) => ({ url: `https://meta.discourse.org/search.json?q=${encodeURIComponent(query)}` }),
    parse: (data) => list(record(data)?.posts).flatMap((item) => {
      const row = record(item)
      const topic = str(row?.topic_id)
      return [{
        title: str(row?.blurb) || `Tópico ${topic}`,
        url: topic ? `https://meta.discourse.org/t/${topic}` : '',
        snippet: str(row?.username),
      }]
    }),
  },
  {
    id: 'python-discuss',
    name: 'Python Discuss',
    group: 'Fórum',
    request: (query) => ({ url: `https://discuss.python.org/search.json?q=${encodeURIComponent(query)}` }),
    parse: (data) => list(record(data)?.posts).flatMap((item) => {
      const row = record(item)
      const topic = str(row?.topic_id)
      return [{
        title: str(row?.blurb) || `Tópico ${topic}`,
        url: topic ? `https://discuss.python.org/t/${topic}` : '',
        snippet: str(row?.username),
      }]
    }),
  },
  wiki('en.wikipedia.org', 'Wikipédia EN', 'Dados'),
  wiki('pt.wikipedia.org', 'Wikipédia PT', 'Dados'),
  wiki('en.wikinews.org', 'Wikinews', 'Dados'),
  wiki('commons.wikimedia.org', 'Wikimedia Commons', 'Mídia'),
  {
    id: 'wikidata',
    name: 'Wikidata',
    group: 'Dados',
    request: (query) => ({
      url: `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&limit=3`,
    }),
    parse: (data) => list(record(data)?.search).flatMap((item) => {
      const row = record(item)
      const id = str(row?.id)
      return [{
        title: str(row?.label),
        url: str(row?.concepturi) || (id ? `https://www.wikidata.org/wiki/${id}` : ''),
        snippet: str(row?.description),
      }]
    }),
  },
  {
    id: 'dbpedia',
    name: 'DBpedia',
    group: 'Dados',
    request: (query) => ({
      url: `https://lookup.dbpedia.org/api/search?query=${encodeURIComponent(query)}&format=json&maxResults=3`,
    }),
    parse: (data) => list(record(data)?.docs).flatMap((item) => {
      const row = record(item)
      const resource = list(row?.resource).map(str).find((url) => url.startsWith('http')) || ''
      return [{ title: textOf(row?.label), url: resource, snippet: textOf(row?.comment) }]
    }),
  },
  {
    id: 'openalex',
    name: 'OpenAlex',
    group: 'Dados',
    request: (query) => ({ url: `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=3` }),
    parse: (data) => list(record(data)?.results).flatMap((item) => {
      const row = record(item)
      const venue = str(record(record(row?.primary_location)?.source)?.display_name)
      const year = str(row?.publication_year)
      return [{ title: str(row?.display_name), url: str(row?.id), snippet: [year, venue].filter(Boolean).join(' · ') }]
    }),
  },
  {
    id: 'crossref',
    name: 'Crossref',
    group: 'Dados',
    request: (query) => ({ url: `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=3` }),
    parse: (data) => list(record(record(data)?.message)?.items).flatMap((item) => {
      const row = record(item)
      return [{ title: textOf(row?.title), url: str(row?.URL), snippet: textOf(row?.container_title) || str(row?.publisher) }]
    }),
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    group: 'Dados',
    request: (query) => ({
      url: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=3&term=${encodeURIComponent(query)}`,
    }),
    parse: (data) => list(record(record(data)?.esearchresult)?.idlist).flatMap((id) => {
      const pmid = str(id)
      if (!pmid) return []
      return [{ title: `PMID ${pmid}`, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, snippet: 'Artigo indexado no PubMed' }]
    }),
  },
  {
    id: 'doaj',
    name: 'DOAJ',
    group: 'Dados',
    request: (query) => ({ url: `https://doaj.org/api/search/articles/${encodeURIComponent(query)}?pageSize=3` }),
    parse: (data) => list(record(data)?.results).flatMap((item) => {
      const bib = record(record(item)?.bibjson)
      const link = list(bib?.link).map(record).find((row) => str(row?.url).startsWith('http'))
      return [{ title: textOf(bib?.title), url: str(link?.url), snippet: textOf(bib?.abstract) }]
    }),
  },
  {
    id: 'zenodo',
    name: 'Zenodo',
    group: 'Dados',
    request: (query) => ({ url: `https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=3` }),
    parse: (data) => list(record(record(data)?.hits)?.hits).flatMap((item) => {
      const row = record(item)
      const links = record(row?.links)
      return [{ title: textOf(row?.title) || textOf(record(row?.metadata)?.title), url: str(links?.self_html), snippet: str(row?.doi) }]
    }),
  },
  {
    id: 'osf',
    name: 'OSF',
    group: 'Dados',
    request: (query) => ({ url: `https://api.osf.io/v2/nodes/?filter[title]=${encodeURIComponent(query)}&page[size]=3` }),
    parse: (data) => list(record(data)?.data).flatMap((item) => {
      const row = record(item)
      const attrs = record(row?.attributes)
      return [{ title: str(attrs?.title), url: str(record(row?.links)?.html), snippet: str(attrs?.description) }]
    }),
  },
  {
    id: 'openlibrary',
    name: 'Open Library',
    group: 'Dados',
    request: (query) => ({ url: `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3` }),
    parse: (data) => list(record(data)?.docs).flatMap((item) => {
      const row = record(item)
      const key = str(row?.key)
      return [{ title: str(row?.title), url: key ? `https://openlibrary.org${key}` : '', snippet: textOf(row?.author_name) }]
    }),
  },
  {
    id: 'archive',
    name: 'Internet Archive',
    group: 'Dados',
    request: (query) => ({
      url: `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&output=json&rows=3&fl[]=identifier&fl[]=title&fl[]=description`,
    }),
    parse: (data) => list(record(record(data)?.response)?.docs).flatMap((item) => {
      const row = record(item)
      const id = str(row?.identifier)
      return [{ title: textOf(row?.title), url: id ? `https://archive.org/details/${id}` : '', snippet: textOf(row?.description) }]
    }),
  },
  {
    id: 'europe',
    name: 'data.europa.eu',
    group: 'Dados',
    request: (query) => ({ url: `https://data.europa.eu/api/hub/search/search?q=${encodeURIComponent(query)}&limit=3` }),
    parse: (data) => list(record(record(data)?.result)?.results).flatMap((item) => {
      const row = record(item)
      const id = textOf(row?.id)
      const page = textOf(row?.page) || textOf(row?.resource)
      const url = page.startsWith('http') ? page : (id ? `https://data.europa.eu/data/datasets/${encodeURIComponent(id)}` : '')
      return [{ title: textOf(row?.title), url, snippet: textOf(row?.description) }]
    }),
  },
  {
    id: 'worldbank',
    name: 'World Bank',
    group: 'Dados',
    request: (query) => ({ url: `https://search.worldbank.org/api/v2/wds?format=json&qterm=${encodeURIComponent(query)}&rows=3` }),
    parse: (data) => Object.values(record(record(data)?.documents) ?? {}).flatMap((item) => {
      const row = record(item)
      if (!row) return []
      return [{ title: textOf(row.display_title) || textOf(row.docna), url: str(row.url) || str(row.pdfurl), snippet: textOf(row.docty) }]
    }),
  },
  {
    id: 'loc',
    name: 'Library of Congress',
    group: 'Dados',
    request: (query) => ({ url: `https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fo=json&c=3` }),
    parse: (data) => list(record(data)?.results).flatMap((item) => {
      const row = record(item)
      return [{ title: textOf(row?.title), url: absUrl(str(row?.url)), snippet: textOf(row?.description) || textOf(row?.subject) }]
    }),
  },
  {
    id: 'nvd',
    name: 'NVD',
    group: 'Dados',
    request: (query) => ({
      url: `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(query)}&resultsPerPage=3`,
    }),
    parse: (data) => list(record(data)?.vulnerabilities).flatMap((item) => {
      const cve = record(record(item)?.cve)
      const id = str(cve?.id)
      const description = list(cve?.descriptions).map(record).find((row) => str(row?.lang) === 'en')
      return [{ title: id, url: id ? `https://nvd.nist.gov/vuln/detail/${id}` : '', snippet: str(description?.value) }]
    }),
  },
  {
    id: 'gbif',
    name: 'GBIF',
    group: 'Dados',
    request: (query) => ({ url: `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&limit=3` }),
    parse: (data) => list(record(data)?.results).flatMap((item) => {
      const row = record(item)
      const key = str(row?.key)
      return [{ title: str(row?.scientificName) || str(row?.canonicalName), url: key ? `https://www.gbif.org/species/${key}` : '', snippet: str(row?.rank) }]
    }),
  },
  {
    id: 'nominatim',
    name: 'OpenStreetMap',
    group: 'Dados',
    request: (query) => ({ url: `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3` }),
    parse: (data) => list(data).flatMap((item) => {
      const row = record(item)
      const kind = str(row?.osm_type)
      const id = str(row?.osm_id)
      const prefix = kind === 'node' ? 'node' : kind === 'way' ? 'way' : 'relation'
      return [{ title: str(row?.display_name), url: id ? `https://www.openstreetmap.org/${prefix}/${id}` : '', snippet: str(row?.type) }]
    }),
  },
  {
    id: 'nasa',
    name: 'NASA Images',
    group: 'Mídia',
    request: (query) => ({ url: `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image` }),
    parse: (data) => list(record(record(data)?.collection)?.items).flatMap((item) => {
      const meta = record(list(record(item)?.data)[0])
      const nasaId = str(meta?.nasa_id)
      return [{ title: str(meta?.title), url: nasaId ? `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}` : '', snippet: str(meta?.description) }]
    }),
  },
  {
    id: 'openverse',
    name: 'Openverse',
    group: 'Mídia',
    request: (query) => ({ url: `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=3` }),
    parse: (data) => list(record(data)?.results).flatMap((item) => {
      const row = record(item)
      return [{ title: str(row?.title), url: str(row?.foreign_landing_url), snippet: str(row?.creator) }]
    }),
  },
  {
    id: 'github',
    name: 'GitHub',
    group: 'Código',
    request: (query) => {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }
      const token = process.env.GITHUB_TOKEN?.trim()
      if (token) headers.Authorization = `Bearer ${token}`
      return { url: `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=3&sort=stars`, headers }
    },
    parse: (data) => {
      const body = record(data)
      if (str(body?.message) && !Array.isArray(body?.items)) throw new Error(str(body?.message))
      return list(body?.items).flatMap((item) => {
        const row = record(item)
        return [{ title: str(row?.full_name), url: str(row?.html_url), snippet: str(row?.description) }]
      })
    },
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    group: 'Código',
    request: (query) => ({
      url: `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(query)}&per_page=3&simple=true&order_by=last_activity_at`,
    }),
    parse: (data) => list(data).flatMap((item) => {
      const row = record(item)
      return [{ title: str(row?.path_with_namespace), url: str(row?.web_url), snippet: str(row?.description) }]
    }),
  },
  {
    id: 'npm',
    name: 'npm',
    group: 'Código',
    request: (query) => ({ url: `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=3` }),
    parse: (data) => list(record(data)?.objects).flatMap((item) => {
      const pkg = record(record(item)?.package)
      return [{ title: str(pkg?.name), url: str(record(pkg?.links)?.npm), snippet: str(pkg?.description) }]
    }),
  },
  {
    id: 'crates',
    name: 'crates.io',
    group: 'Código',
    request: (query) => ({ url: `https://crates.io/api/v1/crates?q=${encodeURIComponent(query)}&per_page=3` }),
    parse: (data) => list(record(data)?.crates).flatMap((item) => {
      const row = record(item)
      const name = str(row?.name)
      return [{ title: name, url: name ? `https://crates.io/crates/${name}` : '', snippet: str(row?.description) }]
    }),
  },
  {
    id: 'hf-models',
    name: 'Hugging Face modelos',
    group: 'Código',
    request: (query) => ({ url: `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=3` }),
    parse: (data) => list(data).flatMap((item) => {
      const row = record(item)
      const id = str(row?.id)
      return [{ title: id, url: id ? `https://huggingface.co/${id}` : '', snippet: str(row?.pipeline_tag) }]
    }),
  },
  {
    id: 'hf-datasets',
    name: 'Hugging Face datasets',
    group: 'Dados',
    request: (query) => ({ url: `https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=3` }),
    parse: (data) => list(data).flatMap((item) => {
      const row = record(item)
      const id = str(row?.id)
      return [{ title: id, url: id ? `https://huggingface.co/datasets/${id}` : '', snippet: 'Dataset público' }]
    }),
  },
  {
    id: 'mdn',
    name: 'MDN',
    group: 'Código',
    request: (query) => ({ url: `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US` }),
    parse: (data) => list(record(data)?.documents).flatMap((item) => {
      const row = record(item)
      const path = str(row?.mdn_url)
      return [{ title: str(row?.title), url: path ? `https://developer.mozilla.org${path}` : '', snippet: str(row?.summary) }]
    }),
  },
]

export const DEEP_SOURCE_COUNT = SOURCES.length

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function runSource(source: Source, query: string): Promise<{ hits: DeepHit[]; report: DeepReport }> {
  try {
    const spec = source.request(query)
    const response = await requestPublic(spec.url, {
      ms: 7000,
      headers: spec.headers,
      accept: 'application/json',
      maxBytes: 400_000,
    })
    if (response.status === 429) throw new Error('limite da fonte')
    if (response.status >= 400) throw new Error(`HTTP ${response.status}`)
    let data: unknown
    try {
      data = JSON.parse(response.text)
    } catch {
      throw new Error('resposta não JSON')
    }
    const hits = take(source.parse(data)).map((hit) => ({
      ...hit,
      source: source.name,
      group: source.group,
    }))
    return {
      hits,
      report: { name: source.name, group: source.group, status: hits.length ? 'ok' : 'empty', count: hits.length },
    }
  } catch (error) {
    return {
      hits: [],
      report: {
        name: source.name,
        group: source.group,
        status: 'error',
        count: 0,
        error: friendlyError(error),
      },
    }
  }
}

export async function runDeep(query: string): Promise<{ hits: DeepHit[]; reports: DeepReport[] }> {
  const results = await mapPool(SOURCES, 8, (source) => runSource(source, query))
  return {
    hits: results.flatMap((result) => result.hits),
    reports: results.map((result) => result.report),
  }
}
