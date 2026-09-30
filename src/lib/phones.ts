/** Extrai e normaliza telefones (foco BR + E.164 genérico) a partir de texto livre. */

const DIGIT_RUN =
  /(?:\+|00)?[\d][\d\s.\-()]{7,22}\d|\b\d{10,15}\b/g

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function stripLeadingZerosIntl(digits: string): string {
  if (digits.startsWith('00')) return digits.slice(2)
  return digits
}

/** Normaliza para E.164 aproximado (sem lib externa). */
export function toE164(raw: string, defaultCountry = '55'): string | null {
  let digits = stripLeadingZerosIntl(onlyDigits(raw))
  if (!digits) return null

  // Já com código do país BR
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`
  }

  // BR local: DDD + 8/9 dígitos
  if (defaultCountry === '55') {
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`
    }
    // Com 0 inicial (0XX...)
    if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
      return `+55${digits.slice(1)}`
    }
  }

  // Internacional genérico 10–15 dígitos
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }

  return null
}

export function formatDisplay(e164: string): string {
  const d = e164.replace(/\D/g, '')
  if (d.startsWith('55') && d.length === 13) {
    // +55 (11) 9XXXX-XXXX
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  }
  if (d.startsWith('55') && d.length === 12) {
    // +55 (11) XXXX-XXXX
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`
  }
  return e164
}

export function isValidPhone(e164: string): boolean {
  const d = e164.replace(/\D/g, '')
  return d.length >= 10 && d.length <= 15
}

type Extracted = { phone: string; e164: string; name: string; notes: string }

function nameNearLine(line: string, match: string): string {
  // "João Silva: +55 11 99999-0000" ou "João - 11999990000"
  const cleaned = line.replace(match, '').replace(/[:-–—|]+\s*$/g, '').trim()
  const withoutNoise = cleaned
    .replace(/^(nome|name|contato|tel|telefone|whatsapp|wa)\s*[:-]?\s*/i, '')
    .trim()
  if (withoutNoise.length >= 2 && withoutNoise.length <= 80 && !/^\d+$/.test(withoutNoise)) {
    return withoutNoise
  }
  return ''
}

/** CSV simples: phone,name,notes ou name,phone */
export function parseCsv(text: string): Extracted[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const first = lines[0].toLowerCase()
  const hasHeader =
    first.includes('phone') ||
    first.includes('telefone') ||
    first.includes('numero') ||
    first.includes('número') ||
    first.includes('name') ||
    first.includes('nome')

  const rows = hasHeader ? lines.slice(1) : lines
  const out: Extracted[] = []

  for (const row of rows) {
    const cols = row.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''))
    if (cols.length === 0) continue

    let phoneRaw = ''
    let name = ''
    let notes = ''

    if (hasHeader) {
      const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase())
      const idxPhone = headers.findIndex((h) =>
        /phone|tel|telefone|numero|número|celular|whats/.test(h),
      )
      const idxName = headers.findIndex((h) => /name|nome|contato/.test(h))
      const idxNotes = headers.findIndex((h) => /note|obs|descri/.test(h))
      phoneRaw = idxPhone >= 0 ? cols[idxPhone] ?? '' : cols[0] ?? ''
      name = idxName >= 0 ? cols[idxName] ?? '' : ''
      notes = idxNotes >= 0 ? cols[idxNotes] ?? '' : ''
    } else if (cols.length === 1) {
      phoneRaw = cols[0]
    } else {
      // tenta achar a coluna com mais dígitos
      let best = 0
      let bestIdx = 0
      cols.forEach((c, i) => {
        const n = onlyDigits(c).length
        if (n > best) {
          best = n
          bestIdx = i
        }
      })
      phoneRaw = cols[bestIdx]
      name = cols.find((_, i) => i !== bestIdx) ?? ''
    }

    const e164 = toE164(phoneRaw)
    if (!e164) continue
    out.push({ phone: formatDisplay(e164), e164, name, notes })
  }

  return out
}

export function extractFromText(text: string): {
  items: Extracted[]
  ignored: string[]
  duplicatesInBatch: number
} {
  const ignored: string[] = []
  const seen = new Set<string>()
  const items: Extracted[] = []
  let duplicatesInBatch = 0

  // Se parece CSV, usa parser CSV
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const csvLike =
    lines.length > 1 &&
    lines.slice(0, 5).filter((l) => (l.match(/[,;\t]/g) || []).length >= 1).length >=
      Math.min(2, lines.length)

  if (csvLike && /phone|tel|nome|name|numero|número|,|;|\t/i.test(lines[0])) {
    const parsed = parseCsv(text)
    for (const p of parsed) {
      if (seen.has(p.e164)) {
        duplicatesInBatch += 1
        continue
      }
      seen.add(p.e164)
      items.push(p)
    }
    return { items, ignored, duplicatesInBatch }
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const matches = trimmed.match(DIGIT_RUN) ?? []
    if (matches.length === 0) {
      if (trimmed.length > 3) ignored.push(trimmed)
      continue
    }

    for (const match of matches) {
      const e164 = toE164(match)
      if (!e164 || !isValidPhone(e164)) {
        ignored.push(match)
        continue
      }
      if (seen.has(e164)) {
        duplicatesInBatch += 1
        continue
      }
      seen.add(e164)
      items.push({
        phone: formatDisplay(e164),
        e164,
        name: nameNearLine(trimmed, match),
        notes: '',
      })
    }
  }

  return { items, ignored, duplicatesInBatch }
}

export function toCsv(contacts: { phone: string; e164: string; name: string; notes: string }[]): string {
  const header = 'phone,e164,name,notes'
  const rows = contacts.map((c) =>
    [c.phone, c.e164, c.name, c.notes]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  return [header, ...rows].join('\n')
}

export function toVcf(contacts: { phone: string; e164: string; name: string }[]): string {
  return contacts
    .map((c) => {
      const n = c.name || c.phone
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${n}`,
        `TEL;TYPE=CELL:${c.e164}`,
        'END:VCARD',
      ].join('\n')
    })
    .join('\n')
}

export function whatsappChatUrl(e164: string): string {
  const digits = e164.replace(/\D/g, '')
  return `https://wa.me/${digits}`
}
