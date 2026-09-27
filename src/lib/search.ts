import { createHash } from 'node:crypto'
import { Resolver, reverse } from 'node:dns/promises'
import { runDeep, DEEP_SOURCE_COUNT } from './deep'
import { describeIp, requestPublic, withTimeout } from './net'
import { done, fact, facts, runModule } from './module'
import { clip, plain } from './text'
import type { ClassifiedQuery, Fact, ModuleResult, ResultTable } from './types'

type JsonResult = { status: number; json: unknown; error?: string }

function str(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function getJson(url: string, ms = 8000, headers?: HeadersInit): Promise<JsonResult> {
  try {
    const response = await requestPublic(url, { ms, headers, maxBytes: 1_500_000 })
    if (response.status === 404) return { status: 404, json: null }
    let json: unknown = null
    if (response.text) {
      try {
        json = JSON.parse(response.text)
      } catch {
        json = null
      }
    }
    if (response.status >= 400) {
      const limited = url.includes('api.github.com') && (response.status === 403 || response.status === 429)
      return {
        status: response.status,
        json,
        error: limited
          ? 'Limite da API do GitHub. Defina GITHUB_TOKEN no servidor para aumentar a cota.'
          : `HTTP ${response.status}`,
      }
    }
    if (json === null) return { status: response.status, json: null, error: 'resposta não JSON' }
    return { status: response.status, json }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'falha'
    return { status: 0, json: null, error: message === 'The operation was aborted.' ? 'tempo esgotado' : message }
  }
}

function resolver() {
  const client = new Resolver()
  client.setServers(['1.1.1.1', '8.8.8.8'])
  return client
}

async function dnsBundle(host: string) {
  const client = resolver()
  const grab = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await withTimeout(fn(), 5000)
    } catch {
      return null
    }
  }
  const [a, aaaa, mx, ns, txt, soa, cname, caa, dmarc] = await Promise.all([
    grab(() => client.resolve4(host)),
    grab(() => client.resolve6(host)),
    grab(() => client.resolveMx(host)),
    grab(() => client.resolveNs(host)),
    grab(() => client.resolveTxt(host)),
    grab(() => client.resolveSoa(host)),
    grab(() => client.resolveCname(host)),
    grab(() => client.resolveCaa(host)),
    grab(() => client.resolveTxt(`_dmarc.${host}`)),
  ])
  return { a, aaaa, mx, ns, txt, soa, cname, caa, dmarc }
}

function dnsModule(host: string, focus: 'domínio' | 'correio' | 'host'): Promise<ModuleResult> {
  return runModule('dns', 'DNS', 'Registos DNS', async () => {
    const data = await dnsBundle(host)
    const txt = (data.txt ?? []).map((chunks) => chunks.join(''))
    const spf = txt.filter((line) => line.toLowerCase().startsWith('v=spf1'))
    const dmarc = (data.dmarc ?? []).map((chunks) => chunks.join(''))
    const items = facts([
      fact('A', data.a?.join(', ')),
      fact('AAAA', data.aaaa?.join(', ')),
      fact('CNAME', data.cname?.join(', ')),
      fact(
        'MX',
        data.mx
          ?.filter((row) => row.exchange && row.exchange !== '.')
          .sort((a, b) => a.priority - b.priority)
          .map((row) => `${row.priority} ${row.exchange}`)
          .join(' · '),
      ),
      fact('NS', data.ns?.join(', ')),
      fact('SOA', data.soa ? `${data.soa.nsname} · ${data.soa.hostmaster} · série ${data.soa.serial}` : ''),
      fact('SPF', spf.join(' · ')),
      fact('DMARC', dmarc.join(' · ')),
      fact('TXT', txt.filter((line) => !line.toLowerCase().startsWith('v=spf1')).slice(0, 4).join(' · ')),
      fact(
        'CAA',
        data.caa
          ?.map((row) => {
            const tag = row.issue ? 'issue' : row.issuewild ? 'issuewild' : row.iodef ? 'iodef' : 'caa'
            const value = row.issue || row.issuewild || row.iodef || ''
            return `${tag} ${value}`.trim()
          })
          .join(' · '),
      ),
    ])
    const lead =
      focus === 'correio'
        ? 'Servidores de correio e política do domínio.'
        : 'Resolução pública do nome.'
    if (items.length === 0) {
      return { status: 'empty', summary: 'Nenhum registo DNS público encontrado.', facts: [] }
    }
    return done(lead, items)
  })
}

type Vcard = { name: string; email: string; phone: string }

function readVcard(entity: Record<string, unknown>): Vcard {
  const card = entity.vcardArray
  const rows = Array.isArray(card) ? card[1] : null
  const found: Vcard = { name: '', email: '', phone: '' }
  if (!Array.isArray(rows)) return found
  for (const row of rows) {
    if (!Array.isArray(row)) continue
    const key = str(row[0])
    const value = str(row[3])
    if (key === 'fn') found.name = value
    if (key === 'email') found.email = value
    if (key === 'tel') found.phone = value.replace(/^tel:/i, '')
  }
  return found
}

const ROLE_PT: Record<string, string> = {
  registrar: 'Registrador',
  abuse: 'Abuso',
  administrative: 'Administrativo',
  technical: 'Técnico',
  registrant: 'Titular',
  billing: 'Faturação',
  noc: 'NOC',
}

function rdapFacts(json: unknown): { items: Fact[]; table?: ResultTable } {
  const body = record(json)
  if (!body) return { items: [] }
  const events = Array.isArray(body.events) ? body.events : []
  const eventRows = events
    .map((event) => {
      const item = record(event)
      if (!item) return null
      const action = str(item.eventAction)
      const date = str(item.eventDate).replace('T', ' ').replace('Z', ' UTC')
      return action && date ? [action, date] : null
    })
    .filter((row): row is string[] => Boolean(row))
    .slice(0, 8)

  const nameservers = (Array.isArray(body.nameservers) ? body.nameservers : [])
    .map((ns) => str(record(ns)?.ldhName))
    .filter(Boolean)

  const entities = Array.isArray(body.entities) ? body.entities : []
  const contacts = entities
    .map((entity) => {
      const item = record(entity)
      if (!item) return null
      const roles = Array.isArray(item.roles) ? item.roles.map((role) => ROLE_PT[str(role)] || str(role)) : []
      const card = readVcard(item)
      const label = roles.filter(Boolean).join(', ') || 'Entidade'
      const value = [card.name, card.email, card.phone].filter(Boolean).join(' · ')
      return value ? fact(label, value, card.email ? `mailto:${card.email}` : undefined) : null
    })
    .filter((item): item is Fact => Boolean(item))
    .slice(0, 8)

  const status = Array.isArray(body.status) ? body.status.map((item) => str(item)).filter(Boolean) : []
  const items = facts([
    fact('Nome', str(body.ldhName) || str(body.handle) || str(body.name)),
    fact('Handle', str(body.handle)),
    fact('Tipo', str(body.type) || str(body.ipVersion)),
    fact('País', str(body.country)),
    fact('Início', str(body.startAddress)),
    fact('Fim', str(body.endAddress)),
    fact('Estado', status.join(', ')),
    fact('Nameservers', nameservers.join(', ')),
    fact('WHOIS', str(body.port43)),
    ...contacts,
  ])
  return {
    items,
    table: eventRows.length ? { columns: ['Evento', 'Data'], rows: eventRows } : undefined,
  }
}

function rdapDomainModule(domain: string): Promise<ModuleResult> {
  return runModule('rdap', 'RDAP', 'Registo do domínio', async () => {
    const response = await getJson(`https://rdap.org/domain/${encodeURIComponent(domain)}`, 9000)
    if (response.status === 404) {
      return { status: 'empty', summary: 'Sem registo RDAP público para este domínio.', facts: [] }
    }
    if (response.error) throw new Error(response.error)
    const parsed = rdapFacts(response.json)
    return done('Dados públicos de registo.', parsed.items, parsed.table)
  })
}

function rdapIpModule(ip: string): Promise<ModuleResult> {
  return runModule('rdap-ip', 'RDAP', 'Registo do IP', async () => {
    const response = await getJson(`https://rdap.org/ip/${encodeURIComponent(ip)}`, 9000)
    if (response.status === 404) {
      return { status: 'empty', summary: 'Sem registo RDAP público para este IP.', facts: [] }
    }
    if (response.error) throw new Error(response.error)
    const parsed = rdapFacts(response.json)
    return done('Bloco anunciado em RDAP.', parsed.items, parsed.table)
  })
}

function issuerCn(value: string): string {
  const match = value.match(/CN=([^,]+)/i)
  return plain(match?.[1] || value).slice(0, 80)
}

function certModule(domain: string): Promise<ModuleResult> {
  return runModule('ct', 'crt.sh', 'Transparência de certificados', async () => {
    const response = await getJson(
      `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json&exclude=expired`,
      12000,
    )
    if (response.error) throw new Error(response.error)
    if (!Array.isArray(response.json)) throw new Error('resposta inesperada do crt.sh')
    const seen = new Set<string>()
    const rows: string[][] = []
    for (const entry of response.json) {
      const item = record(entry)
      if (!item) continue
      const names = str(item.name_value)
        .split('\n')
        .map((name) => name.trim().toLowerCase().replace(/^\*\./, ''))
        .filter((name) => name === domain || name.endsWith(`.${domain}`))
      const issuer = issuerCn(str(item.issuer_name))
      const until = str(item.not_after).slice(0, 10)
      for (const name of names) {
        if (seen.has(name)) continue
        seen.add(name)
        rows.push([name, issuer, until])
        if (rows.length >= 25) break
      }
      if (rows.length >= 25) break
    }
    const table: ResultTable = { columns: ['Nome', 'Emissor', 'Expira'], rows }
    return done(
      rows.length ? `${seen.size} nomes públicos em certificados.` : 'Nenhum certificado público encontrado.',
      [],
      table,
    )
  })
}

function waybackDate(timestamp: string): string {
  if (timestamp.length < 8) return timestamp
  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`
}

function waybackModule(host: string): Promise<ModuleResult> {
  return runModule('wayback', 'Wayback Machine', 'Arquivo da web', async () => {
    const response = await getJson(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(host)}&output=json&fl=timestamp,original,statuscode,mimetype&limit=12&collapse=digest`,
      8000,
    )
    if (response.status === 503) {
      return {
        status: 'error',
        summary: 'O Internet Archive está temporariamente offline.',
        facts: [],
        error: 'HTTP 503',
      }
    }
    if (response.error) throw new Error(response.error)
    if (!Array.isArray(response.json) || response.json.length < 2) {
      return { status: 'empty', summary: 'Sem capturas públicas no arquivo.', facts: [] }
    }
    const rows = response.json.slice(1).flatMap((row) => {
      if (!Array.isArray(row) || row.length < 3) return []
      const timestamp = str(row[0])
      const original = str(row[1])
      const status = str(row[2])
      const archive = `https://web.archive.org/web/${timestamp}/${original}`
      return [[waybackDate(timestamp), status || '—', archive]]
    })
    return done(
      rows.length ? `${rows.length} capturas públicas.` : 'Sem capturas públicas no arquivo.',
      [],
      { columns: ['Data', 'Estado', 'Arquivo'], rows },
    )
  })
}

function pageModule(target: string): Promise<ModuleResult> {
  return runModule('http', 'HTTP', 'Página pública', async () => {
    const candidates = target.startsWith('http://')
      ? [target]
      : [target, target.replace(/^https:\/\//, 'http://')]
    let lastError = 'sem resposta'
    for (const candidate of candidates) {
      try {
        const response = await requestPublic(candidate, {
          ms: 8000,
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          maxBytes: 70_000,
        })
        const match = response.text.match(/<title[^>]*>([\s\S]{0,200})<\/title>/i)
        const title = match ? clip(match[1], 180) : ''
        return done('Resposta HTTP do endereço público.', facts([
          fact('Estado', String(response.status)),
          fact('URL final', response.finalUrl, response.finalUrl),
          fact('Tipo', response.contentType),
          fact('Título', title),
        ]))
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'falha'
      }
    }
    throw new Error(lastError)
  })
}

function securityTxtModule(domain: string): Promise<ModuleResult> {
  return runModule('security-txt', 'security.txt', 'Contacto de segurança', async () => {
    const response = await requestPublic(`https://${domain}/.well-known/security.txt`, {
      ms: 7000,
      accept: 'text/plain',
      maxBytes: 20_000,
    })
    if (response.status === 404 || response.status === 410) {
      return { status: 'empty', summary: 'Sem security.txt publicado.', facts: [] }
    }
    if (response.status >= 400) throw new Error(`HTTP ${response.status}`)
    if (response.contentType.includes('html')) {
      return { status: 'empty', summary: 'O caminho não publica um security.txt.', facts: [] }
    }
    const lines = response.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .slice(0, 12)
    const wanted = lines.filter((line) => /^(contact|expires|policy|preferred-languages|canonical|acknowledgments):/i.test(line))
    const shown = (wanted.length ? wanted : lines).slice(0, 8)
    const items = shown.map((line) => {
      const split = line.indexOf(':')
      if (split === -1) return fact('Linha', line)
      const label = line.slice(0, split).trim()
      const value = line.slice(split + 1).trim()
      return fact(label, value, value.startsWith('http') || value.startsWith('mailto:') ? value : undefined)
    })
    return done('Ficheiro público de divulgação de segurança.', facts(items))
  })
}

async function firstPublicAddress(host: string): Promise<string | null> {
  const client = resolver()
  try {
    const v4 = await withTimeout(client.resolve4(host), 5000)
    if (v4[0] && !describeIp(v4[0])) return v4[0]
  } catch {
    /* tenta AAAA */
  }
  try {
    const v6 = await withTimeout(client.resolve6(host), 5000)
    if (v6[0] && !describeIp(v6[0])) return v6[0]
  } catch {
    return null
  }
  return null
}

function geoModule(ip: string): Promise<ModuleResult> {
  return runModule('geo', 'ipwho.is', 'Geolocalização', async () => {
    const scope = describeIp(ip)
    if (scope) {
      return done('Consulta externa omitida.', facts([fact('Âmbito', scope), fact('IP', ip)]))
    }
    const response = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}`)
    if (response.error) throw new Error(response.error)
    const body = record(response.json)
    if (!body || body.success === false) {
      return { status: 'empty', summary: str(body?.message) || 'Sem geolocalização pública.', facts: [] }
    }
    const connection = record(body.connection)
    const timezone = record(body.timezone)
    const lat = typeof body.latitude === 'number' ? body.latitude : null
    const lon = typeof body.longitude === 'number' ? body.longitude : null
    const map = lat !== null && lon !== null ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=8/${lat}/${lon}` : undefined
    return done('Localização aproximada de fonte pública.', facts([
      fact('IP', str(body.ip) || ip),
      fact('Tipo', str(body.type)),
      fact('País', [str(body.country), str(body.country_code)].filter(Boolean).join(' · ')),
      fact('Região', str(body.region)),
      fact('Cidade', str(body.city)),
      fact('ISP', str(connection?.isp)),
      fact('Organização', str(connection?.org)),
      fact('ASN', connection?.asn ? `AS${str(connection.asn)}` : ''),
      fact('Fuso', str(timezone?.id) || str(timezone?.utc)),
      fact('Coordenadas', lat !== null && lon !== null ? `${lat}, ${lon}` : '', map),
    ]))
  })
}

function geoFromHostModule(host: string): Promise<ModuleResult> {
  return runModule('geo', 'ipwho.is', 'Geolocalização', async () => {
    const ip = await firstPublicAddress(host)
    if (!ip) {
      return { status: 'empty', summary: 'Sem endereço público para geolocalizar.', facts: [] }
    }
    const inner = await geoModule(ip)
    return {
      status: inner.status,
      summary: inner.summary,
      facts: [fact('Endereço', ip), ...inner.facts.filter((item) => item.label !== 'IP')].filter((item): item is Fact => Boolean(item)),
      table: inner.table,
      error: inner.error,
    }
  })
}

function reverseDnsModule(ip: string): Promise<ModuleResult> {
  return runModule('ptr', 'DNS reverso', 'Nomes associados', async () => {
    if (describeIp(ip)) {
      return { status: 'empty', summary: 'Sem consulta reversa para endereço não público.', facts: [] }
    }
    try {
      const names = await withTimeout(reverse(ip), 5000)
      return done(
        names.length ? 'Pontos PTR públicos.' : 'Sem PTR público.',
        facts(names.slice(0, 8).map((name) => fact('PTR', name))),
      )
    } catch {
      return { status: 'empty', summary: 'Sem PTR público.', facts: [] }
    }
  })
}

function localIpModule(ip: string, scope: string): ModuleResult {
  return {
    id: 'scope',
    source: 'Rede',
    title: 'Classificação do endereço',
    status: 'ok',
    summary: 'Endereço não público. Nenhuma fonte externa foi consultada.',
    facts: facts([fact('IP', ip), fact('Âmbito', scope)]),
    ms: 0,
  }
}

function gravatarModule(email: string): Promise<ModuleResult> {
  return runModule('gravatar', 'Gravatar', 'Perfil Gravatar', async () => {
    const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex')
    const profile = `https://gravatar.com/${hash}`
    const response = await getJson(`https://gravatar.com/${hash}.json`)
    if (response.status === 404) {
      return { status: 'empty', summary: 'Sem perfil Gravatar público.', facts: facts([fact('URL', profile, profile)]) }
    }
    if (response.error) throw new Error(response.error)
    const entryList = record(response.json)?.entry
    const entry = record(Array.isArray(entryList) ? entryList[0] : null)
    const accounts = Array.isArray(entry?.accounts) ? entry.accounts : []
    const links = accounts
      .map((account) => {
        const item = record(account)
        if (!item) return null
        return fact(str(item.shortname) || 'Conta', str(item.display) || str(item.url), str(item.url) || undefined)
      })
      .filter((item): item is Fact => Boolean(item))
      .slice(0, 6)
    return done('Perfil público associado ao hash do e-mail.', facts([
      fact('Nome', str(entry?.displayName)),
      fact('Local', str(entry?.currentLocation)),
      fact('Sobre', str(entry?.aboutMe)),
      fact('Perfil', profile, profile),
      ...links,
    ]))
  })
}

function githubCommitsModule(email: string): Promise<ModuleResult> {
  return runModule('github-commits', 'GitHub', 'Commits públicos', async () => {
    const response = await getJson(
      `https://api.github.com/search/commits?q=${encodeURIComponent(`author-email:${email}`)}&per_page=5&sort=author-date&order=desc`,
      8000,
      githubHeaders(),
    )
    if (response.error) throw new Error(response.error)
    const body = record(response.json)
    const items = Array.isArray(body?.items) ? body.items : []
    const rows = items.flatMap((item) => {
      const row = record(item)
      const commit = record(row?.commit)
      const repo = record(row?.repository)
      const message = str(commit?.message).split('\n')[0]
      const url = str(row?.html_url)
      if (!url && !message) return []
      return [[str(repo?.full_name) || '—', clip(message, 90), url]]
    })
    const total = typeof body?.total_count === 'number' ? body.total_count : rows.length
    return done(
      total ? `${total} commits públicos com este autor.` : 'Nenhum commit público com este e-mail.',
      [],
      { columns: ['Repositório', 'Mensagem', 'URL'], rows },
    )
  })
}

function githubUserModule(username: string): Promise<ModuleResult> {
  return runModule('github-user', 'GitHub', 'Perfil GitHub', async () => {
    const response = await getJson(`https://api.github.com/users/${encodeURIComponent(username)}`, 7000, githubHeaders())
    if (response.status === 404) {
      return { status: 'empty', summary: 'Utilizador GitHub inexistente.', facts: [] }
    }
    if (response.error) throw new Error(response.error)
    const user = record(response.json)
    if (!user) throw new Error('resposta inesperada do GitHub')
    const blog = str(user.blog)
    const blogUrl = blog && !/^https?:\/\//i.test(blog) ? `https://${blog}` : blog
    return done('Conta pública no GitHub.', facts([
      fact('Login', str(user.login)),
      fact('Nome', str(user.name)),
      fact('Bio', str(user.bio)),
      fact('Empresa', str(user.company)),
      fact('Local', str(user.location)),
      fact('Site', blogUrl, blogUrl || undefined),
      fact('Twitter', str(user.twitter_username) ? `@${str(user.twitter_username)}` : ''),
      fact('Repositórios', str(user.public_repos)),
      fact('Seguidores', str(user.followers)),
      fact('Desde', str(user.created_at).slice(0, 10)),
      fact('Perfil', str(user.html_url), str(user.html_url) || undefined),
    ]))
  })
}

type ProfileHit = {
  network: string
  state: 'encontrado' | 'ausente' | 'sem resposta'
  name: string
  url: string
  detail: string
}

function profile(network: string, state: ProfileHit['state'], name: string, url: string, detail: string): ProfileHit {
  return { network, state, name, url, detail: clip(detail, 160) }
}

async function profilesModule(username: string): Promise<ModuleResult> {
  return runModule('profiles', 'Perfis', 'Outras contas públicas', async () => {
    const user = encodeURIComponent(username)
    const actor = username.includes('.') ? username : `${username}.bsky.social`
    const checks: Array<() => Promise<ProfileHit>> = [
      async () => {
        const response = await getJson(`https://gitlab.com/api/v4/users?username=${user}`)
        if (response.error) return profile('GitLab', 'sem resposta', '', '', response.error)
        const list = Array.isArray(response.json) ? response.json : []
        const item = record(list[0])
        if (!item) return profile('GitLab', 'ausente', '', `https://gitlab.com/${username}`, '')
        return profile('GitLab', 'encontrado', str(item.name) || str(item.username), str(item.web_url), str(item.bio))
      },
      async () => {
        const response = await getJson(`https://www.reddit.com/user/${user}/about.json`, 7000, { Accept: 'application/json' })
        if (response.status === 404) return profile('Reddit', 'ausente', '', `https://www.reddit.com/user/${username}`, '')
        if (response.error) return profile('Reddit', 'sem resposta', '', '', response.error)
        const data = record(record(response.json)?.data)
        if (!data) return profile('Reddit', 'ausente', '', `https://www.reddit.com/user/${username}`, '')
        return profile('Reddit', 'encontrado', str(data.name), `https://www.reddit.com/user/${username}`, str(record(data.subreddit)?.public_description))
      },
      async () => {
        const response = await getJson(`https://dev.to/api/users/by_username?url=${user}`)
        if (response.status === 404) return profile('DEV', 'ausente', '', `https://dev.to/${username}`, '')
        if (response.error) return profile('DEV', 'sem resposta', '', '', response.error)
        const item = record(response.json)
        if (!item?.username) return profile('DEV', 'ausente', '', `https://dev.to/${username}`, '')
        return profile('DEV', 'encontrado', str(item.name), `https://dev.to/${str(item.username)}`, [str(item.location), str(item.summary)].filter(Boolean).join(' · '))
      },
      async () => {
        const response = await getJson(`https://keybase.io/_/api/1.0/user/lookup.json?usernames=${user}`)
        if (response.error) return profile('Keybase', 'sem resposta', '', '', response.error)
        const themList = record(response.json)?.them
        const them = Array.isArray(themList) ? themList[0] : null
        const item = record(them)
        const card = record(item?.profile)
        if (!item || !card) return profile('Keybase', 'ausente', '', `https://keybase.io/${username}`, '')
        return profile('Keybase', 'encontrado', str(card.full_name) || username, `https://keybase.io/${username}`, [str(card.location), str(card.bio)].filter(Boolean).join(' · '))
      },
      async () => {
        const response = await getJson(`https://mastodon.social/api/v1/accounts/lookup?acct=${user}`)
        if (response.status === 404) return profile('Mastodon', 'ausente', '', `https://mastodon.social/@${username}`, '')
        if (response.error) return profile('Mastodon', 'sem resposta', '', '', response.error)
        const item = record(response.json)
        if (!item?.username) return profile('Mastodon', 'ausente', '', `https://mastodon.social/@${username}`, '')
        return profile('Mastodon', 'encontrado', str(item.display_name) || str(item.username), str(item.url) || `https://mastodon.social/@${username}`, plain(str(item.note)))
      },
      async () => {
        const response = await getJson(`https://hub.docker.com/v2/users/${user}/`)
        if (response.status === 404) return profile('Docker Hub', 'ausente', '', `https://hub.docker.com/u/${username}`, '')
        if (response.error) return profile('Docker Hub', 'sem resposta', '', '', response.error)
        const item = record(response.json)
        if (!item?.username && !item?.id) return profile('Docker Hub', 'ausente', '', `https://hub.docker.com/u/${username}`, '')
        return profile('Docker Hub', 'encontrado', str(item.full_name) || str(item.username), `https://hub.docker.com/u/${username}`, [str(item.company), str(item.location)].filter(Boolean).join(' · '))
      },
      async () => {
        const response = await getJson(`https://huggingface.co/api/users/${user}/overview`)
        if (response.status === 404) return profile('Hugging Face', 'ausente', '', `https://huggingface.co/${username}`, '')
        if (response.error) return profile('Hugging Face', 'sem resposta', '', '', response.error)
        const item = record(response.json)
        return profile('Hugging Face', 'encontrado', str(item?.fullname) || str(item?.name) || username, `https://huggingface.co/${username}`, str(item?.details))
      },
      async () => {
        const response = await getJson(`https://codeberg.org/api/v1/users/${user}`)
        if (response.status === 404) return profile('Codeberg', 'ausente', '', `https://codeberg.org/${username}`, '')
        if (response.error) return profile('Codeberg', 'sem resposta', '', '', response.error)
        const item = record(response.json)
        if (!item?.login) return profile('Codeberg', 'ausente', '', `https://codeberg.org/${username}`, '')
        return profile('Codeberg', 'encontrado', str(item.full_name) || str(item.login), `https://codeberg.org/${str(item.login)}`, [str(item.location), str(item.description)].filter(Boolean).join(' · '))
      },
      async () => {
        const response = await getJson(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`)
        if (response.status === 400 || response.status === 404) {
          return profile('Bluesky', 'ausente', '', `https://bsky.app/profile/${actor}`, '')
        }
        if (response.error) return profile('Bluesky', 'sem resposta', '', '', response.error)
        const item = record(response.json)
        const handle = str(item?.handle) || actor
        if (!item?.handle) return profile('Bluesky', 'ausente', '', `https://bsky.app/profile/${actor}`, '')
        return profile('Bluesky', 'encontrado', str(item.displayName) || handle, `https://bsky.app/profile/${handle}`, str(item.description))
      },
      async () => {
        const response = await getJson(`https://registry.npmjs.org/-/user/org.couchdb.user:${user}`)
        if (response.status === 404) return profile('npm', 'ausente', '', `https://www.npmjs.com/~${username}`, '')
        if (response.error) return profile('npm', 'sem resposta', '', '', response.error)
        const item = record(response.json)
        if (!item || item.error) return profile('npm', 'ausente', '', `https://www.npmjs.com/~${username}`, '')
        return profile('npm', 'encontrado', str(item.name) || username, `https://www.npmjs.com/~${username}`, str(item.email))
      },
    ]

    const hits = await Promise.all(checks.map(async (check) => {
      try {
        return await check()
      } catch (error) {
        return profile('Fonte', 'sem resposta', '', '', error instanceof Error ? error.message : 'falha')
      }
    }))
    const found = hits.filter((hit) => hit.state === 'encontrado').length
    return done(
      found ? `${found} perfis públicos encontrados.` : 'Nenhum outro perfil público confirmado.',
      [],
      {
        columns: ['Rede', 'Estado', 'Nome', 'Detalhe', 'URL'],
        rows: hits.map((hit) => [hit.network, hit.state, hit.name || '—', hit.detail || '—', hit.url || '—']),
      },
    )
  })
}

async function wikiSearch(lang: 'pt' | 'en', query: string) {
  const response = await getJson(
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&srlimit=4`,
  )
  if (response.error || !response.json) return []
  const search = record(record(response.json)?.query)?.search
  if (!Array.isArray(search)) return []
  return search.flatMap((item) => {
    const row = record(item)
    const title = str(row?.title)
    if (!title) return []
    return [{ lang, title, snippet: clip(str(row?.snippet), 180) }]
  })
}

function wikiModule(query: string): Promise<ModuleResult> {
  return runModule('wiki', 'Wikipédia', 'Enciclopédia', async () => {
    const [pt, en] = await Promise.all([wikiSearch('pt', query), wikiSearch('en', query)])
    const rows = [...pt, ...en].map((item) => [
      item.lang === 'pt' ? 'PT' : 'EN',
      item.title,
      item.snippet || '—',
      `https://${item.lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
    ])
    let extract = ''
    const first = pt[0] || en[0]
    if (first) {
      const response = await getJson(
        `https://${first.lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(first.title)}&format=json`,
      )
      const pages = record(record(response.json)?.query)?.pages
      const page = pages ? Object.values(pages)[0] : null
      extract = clip(str(record(page)?.extract), 420)
    }
    return done(
      rows.length ? 'Artigos públicos relacionados.' : 'Sem artigos na Wikipédia.',
      facts([fact('Extrato', extract)]),
      { columns: ['Língua', 'Título', 'Trecho', 'URL'], rows },
    )
  })
}

type DdgTopic = { Text?: string; FirstURL?: string; Topics?: DdgTopic[] }

function flattenTopics(topics: DdgTopic[], out: DdgTopic[] = []): DdgTopic[] {
  for (const topic of topics) {
    if (Array.isArray(topic.Topics)) flattenTopics(topic.Topics, out)
    else if (topic.Text) out.push(topic)
  }
  return out
}

function ddgModule(query: string): Promise<ModuleResult> {
  return runModule('ddg', 'DuckDuckGo', 'Resumo web', async () => {
    const response = await getJson(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    )
    if (response.error) throw new Error(response.error)
    const body = record(response.json)
    const topics = flattenTopics(Array.isArray(body?.RelatedTopics) ? (body.RelatedTopics as DdgTopic[]) : []).slice(0, 6)
    const rows = topics.map((topic) => [clip(str(topic.Text), 160), str(topic.FirstURL) || '—'])
    const abstract = clip(str(body?.AbstractText), 420)
    return done(
      abstract || rows.length ? 'Resposta instantânea de fonte pública.' : 'Sem resumo instantâneo.',
      facts([
        fact('Título', str(body?.Heading)),
        fact('Resumo', abstract, str(body?.AbstractURL) || undefined),
      ]),
      { columns: ['Tópico', 'URL'], rows },
    )
  })
}

function hnModule(query: string): Promise<ModuleResult> {
  return runModule('hn', 'Hacker News', 'Discussões', async () => {
    const response = await getJson(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=6&tags=story`,
    )
    if (response.error) throw new Error(response.error)
    const hits = Array.isArray(record(response.json)?.hits) ? (record(response.json)?.hits as unknown[]) : []
    const rows = hits.flatMap((hit) => {
      const item = record(hit)
      const title = str(item?.title) || str(item?.story_title)
      if (!title) return []
      const id = str(item?.objectID)
      const comments = id ? `https://news.ycombinator.com/item?id=${id}` : ''
      return [[
        clip(title, 110),
        str(item?.points) || '0',
        str(item?.author) || '—',
        str(item?.url) || comments,
      ]]
    })
    return done(
      rows.length ? 'Histórias públicas no Hacker News.' : 'Sem histórias públicas.',
      [],
      { columns: ['Título', 'Pontos', 'Autor', 'URL'], rows },
    )
  })
}

function githubReposModule(query: string): Promise<ModuleResult> {
  return runModule('github-repos', 'GitHub', 'Repositórios', async () => {
    const response = await getJson(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5&sort=stars`,
      8000,
      githubHeaders(),
    )
    if (response.error) throw new Error(response.error)
    const items = Array.isArray(record(response.json)?.items) ? (record(response.json)?.items as unknown[]) : []
    const rows = items.flatMap((item) => {
      const repo = record(item)
      const name = str(repo?.full_name)
      if (!name) return []
      return [[name, str(repo?.stargazers_count) || '0', clip(str(repo?.description), 90) || '—', str(repo?.html_url)]]
    })
    return done(
      rows.length ? 'Repositórios públicos ordenados por estrelas.' : 'Nenhum repositório público.',
      [],
      { columns: ['Repositório', 'Estrelas', 'Descrição', 'URL'], rows },
    )
  })
}

function surfaceUrl(href: string): string {
  const raw = href.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
  const absolute = raw.startsWith('//') ? `https:${raw}` : raw
  try {
    const url = new URL(absolute, 'https://duckduckgo.com')
    const target = url.searchParams.get('uddg')
    if (target && /^https?:\/\//i.test(target)) return target
  } catch {
    return ''
  }
  return /^https?:\/\//i.test(absolute) && !absolute.includes('duckduckgo.com/l/') ? absolute : ''
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return '—'
  }
}

function surfaceHits(html: string): Array<{ title: string; url: string; snippet: string }> {
  const hits: Array<{ title: string; url: string; snippet: string }> = []
  const blocks = html.split(/class="result results_links/)
  for (const block of blocks.slice(1)) {
    const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const url = surfaceUrl(titleMatch[1])
    const title = clip(titleMatch[2], 140)
    if (!url || !title || hits.some((hit) => hit.url === url)) continue
    hits.push({ title, url, snippet: snippetMatch ? clip(snippetMatch[1], 220) : '' })
    if (hits.length >= 10) break
  }
  return hits
}

function surfaceModule(query: string): Promise<ModuleResult> {
  return runModule('surface', 'Surface web', 'Páginas públicas', async () => {
    const response = await requestPublic(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { ms: 8000, accept: 'text/html', maxBytes: 400_000 },
    )
    if (response.status >= 400) throw new Error(`HTTP ${response.status}`)
    const hits = surfaceHits(response.text)
    return done(
      hits.length ? `${hits.length} páginas indexadas da surface web.` : 'Nenhuma página pública encontrada.',
      [],
      {
        columns: ['Título', 'Site', 'Trecho', 'URL'],
        rows: hits.map((hit) => [hit.title, hostLabel(hit.url), hit.snippet || '—', hit.url]),
      },
    )
  })
}

function phoneNoteModule(phone: string): ModuleResult {
  return {
    id: 'phone-scope',
    source: 'ORBE',
    title: 'Âmbito da consulta',
    status: 'ok',
    summary: 'A busca usa só menções em fontes públicas. Não consulta assinante, operadora nem bases privadas.',
    facts: facts([fact('Número normalizado', phone)]),
    ms: 0,
  }
}

function deepModules(query: string): Promise<ModuleResult[]> {
  const started = Date.now()
  return runDeep(query).then(({ hits, reports }) => {
    const ms = Date.now() - started
    const withData = reports.filter((report) => report.status === 'ok').length
    const failed = reports.filter((report) => report.status === 'error').length
    const hitsModule: ModuleResult = {
      id: 'deep-hits',
      source: 'Deep',
      title: 'Registos públicos',
      status: hits.length ? 'ok' : 'empty',
      summary: `${DEEP_SOURCE_COUNT} diretórios e fóruns consultados. ${withData} com dados, ${hits.length} registos.`,
      facts: facts([
        fact('Diretórios', String(reports.length)),
        fact('Com dados', String(withData)),
        fact('Vazios', String(reports.filter((report) => report.status === 'empty').length)),
        fact('Falhas', String(failed)),
      ]),
      table: hits.length
        ? {
            columns: ['Diretório', 'Tipo', 'Título', 'Trecho', 'URL'],
            rows: hits.slice(0, 90).map((hit) => [hit.source, hit.group, hit.title, hit.snippet, hit.url]),
          }
        : undefined,
      ms,
    }
    const coverage: ModuleResult = {
      id: 'deep-coverage',
      source: 'Deep',
      title: 'Cobertura da varredura',
      status: 'ok',
      summary: 'Cada linha é um diretório ou fórum público incluído na varredura.',
      facts: [],
      table: {
        columns: ['Diretório', 'Tipo', 'Estado', 'Registos'],
        rows: reports.map((report) => [
          report.name,
          report.group,
          report.status === 'ok' ? 'com dados' : report.status === 'empty' ? 'vazio' : `falha${report.error ? `: ${report.error}` : ''}`,
          String(report.count),
        ]),
      },
      ms,
    }
    return [hitsModule, coverage]
  }).catch((error) => [{
    id: 'deep-hits',
    source: 'Deep',
    title: 'Registos públicos',
    status: 'error',
    summary: 'A varredura não chegou a concluir.',
    facts: [],
    error: error instanceof Error ? error.message : 'falha',
    ms: Date.now() - started,
  }])
}

export async function runSearch(input: ClassifiedQuery): Promise<ModuleResult[]> {
  const jobs: Array<Promise<ModuleResult | ModuleResult[]> | ModuleResult> = []
  const webQuery = input.normalized

  if (input.kind === 'domain' && input.domain) {
    jobs.push(
      dnsModule(input.domain, 'domínio'),
      rdapDomainModule(input.domain),
      certModule(input.domain),
      waybackModule(input.domain),
      pageModule(`https://${input.domain}`),
      securityTxtModule(input.domain),
      geoFromHostModule(input.domain),
    )
  } else if (input.kind === 'ip' && input.ip) {
    const scope = describeIp(input.ip)
    if (scope) jobs.push(localIpModule(input.ip, scope))
    else jobs.push(reverseDnsModule(input.ip), rdapIpModule(input.ip), geoModule(input.ip))
  } else if (input.kind === 'url' && input.url) {
    jobs.push(pageModule(input.url))
    if (input.domain) {
      jobs.push(
        dnsModule(input.domain, 'host'),
        rdapDomainModule(input.domain),
        certModule(input.domain),
        waybackModule(input.domain),
        securityTxtModule(input.domain),
        geoFromHostModule(input.domain),
      )
    } else if (input.ip) {
      const scope = describeIp(input.ip)
      if (scope) jobs.push(localIpModule(input.ip, scope))
      else jobs.push(reverseDnsModule(input.ip), rdapIpModule(input.ip), geoModule(input.ip))
    }
  } else if (input.kind === 'email' && input.email && input.domain) {
    jobs.push(
      dnsModule(input.domain, 'correio'),
      rdapDomainModule(input.domain),
      gravatarModule(input.email),
      githubCommitsModule(input.email),
      ddgModule(input.email),
    )
  } else if (input.kind === 'username' && input.username) {
    jobs.push(
      githubUserModule(input.username),
      profilesModule(input.username),
      wikiModule(input.username),
      hnModule(input.username),
    )
  } else if (input.kind === 'phone' && input.phone) {
    jobs.push(phoneNoteModule(input.phone), wikiModule(webQuery), ddgModule(webQuery), hnModule(webQuery))
  } else if (input.kind === 'surface') {
    jobs.push(surfaceModule(webQuery), ddgModule(webQuery))
  } else if (input.kind === 'deep') {
    jobs.push(deepModules(webQuery))
  } else {
    jobs.push(ddgModule(webQuery), wikiModule(webQuery), hnModule(webQuery), githubReposModule(webQuery))
  }

  const modules = await Promise.all(jobs)
  return modules.flat()
}
