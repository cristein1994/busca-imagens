import type { ClientRecord } from '../types/client'

function digits(value: string): string {
  return value.replace(/\D/g, '')
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

function normalizeHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const HEADER_MAP: Record<string, keyof Omit<ClientRecord, 'id'>> = {
  nome: 'nome',
  name: 'nome',
  cliente: 'nome',
  cpf: 'cpf',
  documento: 'cpf',
  email: 'email',
  e_mail: 'email',
  mail: 'email',
  telefone: 'telefone',
  phone: 'telefone',
  celular: 'telefone',
  fone: 'telefone',
  cidade: 'cidade',
  city: 'cidade',
  notas: 'notas',
  notes: 'notas',
  obs: 'notas',
}

export function parseClientsCsv(text: string): ClientRecord[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('CSV precisa de cabeçalho + pelo menos uma linha.')
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader)
  const indexes: Partial<Record<keyof Omit<ClientRecord, 'id'>, number>> = {}

  headers.forEach((h, i) => {
    const key = HEADER_MAP[h]
    if (key) indexes[key] = i
  })

  if (indexes.nome === undefined && indexes.cpf === undefined && indexes.email === undefined) {
    throw new Error('Cabeçalho precisa ter ao menos: nome, cpf ou email.')
  }

  return lines.slice(1).map((line, row) => {
    const cells = splitCsvLine(line)
    const pick = (key: keyof Omit<ClientRecord, 'id'>) => {
      const i = indexes[key]
      return i === undefined ? '' : (cells[i] ?? '').trim()
    }
    return {
      id: `csv-${row + 1}-${digits(pick('cpf')) || pick('email') || row}`,
      nome: pick('nome'),
      cpf: pick('cpf'),
      email: pick('email'),
      telefone: pick('telefone'),
      cidade: pick('cidade'),
      notas: pick('notas'),
    }
  })
}

export function parseClientsJson(text: string): ClientRecord[] {
  const raw = JSON.parse(text) as unknown
  const list = Array.isArray(raw) ? raw : (raw as { clients?: unknown }).clients
  if (!Array.isArray(list)) {
    throw new Error('JSON deve ser um array de clientes ou { "clients": [...] }.')
  }

  return list.map((item, row) => {
    const r = item as Record<string, unknown>
    const nome = String(r.nome ?? r.name ?? '')
    const cpf = String(r.cpf ?? r.documento ?? '')
    const email = String(r.email ?? r.mail ?? '')
    const telefone = String(r.telefone ?? r.phone ?? r.celular ?? '')
    const cidade = String(r.cidade ?? r.city ?? '')
    const notas = String(r.notas ?? r.notes ?? '')
    return {
      id: String(r.id ?? `json-${row + 1}`),
      nome,
      cpf,
      email,
      telefone,
      cidade,
      notas,
    }
  })
}

export function matchesQuery(
  record: ClientRecord,
  query: string,
  field: 'todos' | 'cpf' | 'email' | 'telefone' | 'nome',
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const qDigits = digits(q)
  const hay = {
    nome: record.nome.toLowerCase(),
    cpf: digits(record.cpf),
    email: record.email.toLowerCase(),
    telefone: digits(record.telefone),
  }

  if (field === 'nome') return hay.nome.includes(q)
  if (field === 'email') return hay.email.includes(q)
  if (field === 'cpf') return qDigits ? hay.cpf.includes(qDigits) : hay.cpf.includes(q)
  if (field === 'telefone') return qDigits ? hay.telefone.includes(qDigits) : false

  return (
    hay.nome.includes(q) ||
    hay.email.includes(q) ||
    (qDigits ? hay.cpf.includes(qDigits) || hay.telefone.includes(qDigits) : false)
  )
}

export function toCsv(records: ClientRecord[]): string {
  const header = 'nome,cpf,email,telefone,cidade,notas'
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const rows = records.map((r) =>
    [r.nome, r.cpf, r.email, r.telefone, r.cidade, r.notas].map(escape).join(','),
  )
  return [header, ...rows].join('\n')
}
