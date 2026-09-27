import { isIP } from 'node:net'
import { domainToASCII } from 'node:url'
import { KIND_LABEL, type ClassifiedQuery, type QueryKind } from './types'

const EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i

export function isDomain(value: string): boolean {
  const ascii = domainToASCII(value.toLowerCase().replace(/\.$/, ''))
  if (!ascii || ascii.length > 253 || ascii.includes('..') || ascii.includes(' ')) return false
  const labels = ascii.split('.')
  if (labels.length < 2) return false
  const tld = labels[labels.length - 1]
  if (!tld || !/^[a-z]{2,63}$/.test(tld)) return false
  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
}

export function parseIp(value: string): string | null {
  const candidate = value.trim().replace(/^\[|\]$/g, '')
  return isIP(candidate) ? candidate : null
}

export function parseEmail(value: string): { email: string; domain: string } | null {
  if (!EMAIL.test(value) || value.length > 180) return null
  const domain = value.split('@')[1]?.toLowerCase()
  if (!domain || !isDomain(domain)) return null
  return { email: value.toLowerCase(), domain }
}

export function parseUsername(value: string): string | null {
  const user = value.startsWith('@') ? value.slice(1) : value
  if (user.length < 2 || user.length > 39) return null
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,38}(?:\.[A-Za-z0-9_-]{1,38})?$/.test(user)) return null
  return user
}

export function parsePhone(value: string): string | null {
  if (/[a-z]/i.test(value)) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  if (!/^[+()\d][\d\s().+-]{7,24}$/.test(value)) return null
  return value.startsWith('+') ? `+${digits}` : digits
}

function hostOf(url: URL): { domain?: string; ip?: string } | null {
  const host = url.hostname.replace(/\.$/, '')
  const ip = parseIp(host)
  if (ip) return { ip }
  if (isDomain(host)) return { domain: domainToASCII(host.toLowerCase()) }
  return null
}

export function parseUrl(value: string): { url: string; domain?: string; ip?: string } | null {
  const looksLikeUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.includes('/')
  if (!looksLikeUrl || value.includes(' ')) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const host = hostOf(url)
    if (!host) return null
    return { url: url.toString(), ...host }
  } catch {
    return null
  }
}

function pack(kind: QueryKind, normalized: string, extra: Partial<ClassifiedQuery>): ClassifiedQuery {
  return {
    raw: normalized,
    normalized,
    kind,
    kindLabel: KIND_LABEL[kind],
    ...extra,
  }
}

function force(normalized: string, kind: QueryKind): ClassifiedQuery {
  if (kind === 'keyword') return pack('keyword', normalized, {})
  if (kind === 'domain') {
    if (!isDomain(normalized)) throw new Error('Este valor não é um domínio.')
    return pack('domain', domainToASCII(normalized.toLowerCase()), {
      domain: domainToASCII(normalized.toLowerCase()),
    })
  }
  if (kind === 'ip') {
    const ip = parseIp(normalized)
    if (!ip) throw new Error('Este valor não é um endereço IP.')
    return pack('ip', ip, { ip })
  }
  if (kind === 'email') {
    const email = parseEmail(normalized)
    if (!email) throw new Error('Este valor não é um e-mail.')
    return pack('email', email.email, email)
  }
  if (kind === 'username') {
    const username = parseUsername(normalized)
    if (!username) throw new Error('Este valor não é um nome de usuário.')
    return pack('username', username, { username })
  }
  if (kind === 'phone') {
    const phone = parsePhone(normalized)
    if (!phone) throw new Error('Este valor não é um telefone.')
    return pack('phone', phone, { phone })
  }
  const url = parseUrl(normalized)
  if (!url) throw new Error('Este valor não é uma URL http(s).')
  return pack('url', url.url, url)
}

export function classify(rawInput: string, forced?: QueryKind): ClassifiedQuery {
  const normalized = rawInput.trim().replace(/\s+/g, ' ')
  if (forced) return force(normalized, forced)

  const url = parseUrl(normalized)
  if (url && /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) return pack('url', url.url, url)
  if (url && normalized.includes('/')) return pack('url', url.url, url)

  const email = parseEmail(normalized)
  if (email) return pack('email', email.email, email)

  const ip = parseIp(normalized)
  if (ip) return pack('ip', ip, { ip })

  const phone = parsePhone(normalized)
  if (phone && /[+\s().-]/.test(normalized)) return pack('phone', phone, { phone })

  if (isDomain(normalized)) {
    const domain = domainToASCII(normalized.toLowerCase().replace(/\.$/, ''))
    return pack('domain', domain, { domain })
  }

  const phoneBare = parsePhone(normalized)
  if (phoneBare && /^\d{10,15}$/.test(normalized)) return pack('phone', phoneBare, { phone: phoneBare })

  const username = parseUsername(normalized)
  if (username && !normalized.includes(' ')) return pack('username', username, { username })

  return pack('keyword', normalized, {})
}
