import { checkTor, torRequest } from './tor.ts'

export type ToolName = 'web_search' | 'fetch_url' | 'tor_status'

export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description:
        'Search the public web through Tor (DuckDuckGo HTML). Returns titles, URLs, snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: {
            type: 'integer',
            description: 'Max results (1-8)',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fetch_url',
      description:
        'Fetch a public http(s) URL through Tor and return stripped text content.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Absolute http(s) URL' },
          maxChars: {
            type: 'integer',
            description: 'Max characters to return',
            default: 8000,
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'tor_status',
      description: 'Check whether outbound traffic exits via Tor and report exit IP.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return true
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split('.').map(Number)
    const [a, b] = parts
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 169 && b === 254) return true
  }
  return false
}

async function webSearch(env: Record<string, string>, query: string, limit = 5): Promise<string> {
  const capped = Math.min(Math.max(limit, 1), 8)
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const res = await torRequest(env, url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0',
      Accept: 'text/html',
    },
    timeoutMs: 40000,
  })

  if (res.status >= 400) {
    return JSON.stringify({ error: `search HTTP ${res.status}`, body: res.body.slice(0, 400) })
  }

  const results: { title: string; url: string; snippet: string }[] = []
  const blockRe =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<td[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/td>)/gi

  let m: RegExpExecArray | null
  while ((m = blockRe.exec(res.body)) !== null && results.length < capped) {
    const href = decodeEntities(m[1])
    const title = stripHtml(m[2])
    const snippet = stripHtml(m[3] || m[4] || '')
    let finalUrl = href
    try {
      const u = new URL(href, 'https://duckduckgo.com')
      const uddg = u.searchParams.get('uddg')
      if (uddg) finalUrl = decodeURIComponent(uddg)
    } catch {
      /* keep href */
    }
    results.push({ title, url: finalUrl, snippet })
  }

  if (results.length === 0) {
    const loose = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    while ((m = loose.exec(res.body)) !== null && results.length < capped) {
      results.push({
        title: stripHtml(m[2]),
        url: decodeEntities(m[1]),
        snippet: '',
      })
    }
  }

  return JSON.stringify({ query, via: 'tor', results }, null, 2)
}

async function fetchUrl(env: Record<string, string>, url: string, maxChars = 8000): Promise<string> {
  const capped = Math.min(Math.max(maxChars, 500), 20000)
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return JSON.stringify({ error: 'invalid url' })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return JSON.stringify({ error: 'only http(s) allowed' })
  }
  if (isBlockedHost(parsed.hostname)) {
    return JSON.stringify({ error: 'private/local hosts blocked' })
  }

  const res = await torRequest(env, url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeoutMs: 45000,
  })

  const text = stripHtml(res.body).slice(0, capped)
  return JSON.stringify(
    {
      url,
      status: res.status,
      via: 'tor',
      length: text.length,
      text,
    },
    null,
    2,
  )
}

export async function runTool(
  env: Record<string, string>,
  name: string,
  argsJson: string,
): Promise<string> {
  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(argsJson || '{}') as Record<string, unknown>
  } catch {
    return JSON.stringify({ error: 'invalid tool arguments JSON' })
  }

  try {
    if (name === 'web_search') {
      const query = String(args.query || '')
      if (!query.trim()) return JSON.stringify({ error: 'query required' })
      const limit = typeof args.limit === 'number' ? args.limit : 5
      return await webSearch(env, query, limit)
    }
    if (name === 'fetch_url') {
      const url = String(args.url || '')
      const maxChars = typeof args.maxChars === 'number' ? args.maxChars : 8000
      return await fetchUrl(env, url, maxChars)
    }
    if (name === 'tor_status') {
      const status = await checkTor(env)
      return JSON.stringify(status, null, 2)
    }
    return JSON.stringify({ error: `unknown tool: ${name}` })
  } catch (e) {
    return JSON.stringify({
      error: e instanceof Error ? e.message : String(e),
      tool: name,
    })
  }
}
