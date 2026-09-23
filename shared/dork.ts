import type { DorkFields, MediaFilter, SearchMode } from './contracts.ts'

function quoteToken(value: string): string {
  const clean = value.replace(/"/g, '').trim()
  if (!clean) return ''
  return clean.includes(' ') ? `"${clean}"` : clean
}

function fileGroup(media: MediaFilter): string {
  if (media === 'video') return '(filetype:mp4 OR filetype:webm OR filetype:mkv OR filetype:mov)'
  if (media === 'image') return '(filetype:jpg OR filetype:jpeg OR filetype:png OR filetype:webp OR filetype:gif)'
  return '(filetype:jpg OR filetype:jpeg OR filetype:png OR filetype:webp OR filetype:gif OR filetype:mp4 OR filetype:webm)'
}

export function buildDork(input: {
  query: string
  mode: SearchMode
  media: MediaFilter
  dork: DorkFields
}): string {
  const parts: string[] = []
  const exact = input.dork.exact.trim()
  const query = input.query.trim()
  if (exact) parts.push(`"${exact.replace(/"/g, '')}"`)
  if (query) parts.push(query)
  if (input.dork.intitle.trim()) parts.push(`intitle:${quoteToken(input.dork.intitle)}`)
  if (input.dork.inurl.trim()) parts.push(`inurl:${input.dork.inurl.trim().replace(/\s+/g, '')}`)
  if (input.dork.site.trim()) parts.push(`site:${input.dork.site.trim().replace(/\s+/g, '')}`)
  if (input.dork.filetype.trim()) parts.push(`filetype:${input.dork.filetype.trim().replace(/^\./, '')}`)
  else if (input.mode === 'metadata') parts.push(fileGroup(input.media))
  if (input.dork.author.trim()) parts.push(quoteToken(input.dork.author))
  if (input.dork.camera.trim()) parts.push(quoteToken(input.dork.camera))
  if (input.dork.resolution.trim()) parts.push(quoteToken(input.dork.resolution))
  if (input.dork.codec.trim()) parts.push(quoteToken(input.dork.codec))
  if (input.dork.after.trim()) parts.push(`after:${input.dork.after.trim()}`)
  if (input.dork.before.trim()) parts.push(`before:${input.dork.before.trim()}`)
  for (const word of input.dork.exclude.split(/\s+/)) {
    const clean = word.trim()
    if (clean) parts.push(`-${clean.replace(/^-/, '')}`)
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function plainTerms(dork: string): string {
  return dork
    .replace(/"[^"]*"/g, (match) => match.slice(1, -1))
    .replace(/\b(filetype|intitle|inurl|site|ext|before|after):(?:\([^)]*\)|[^\s]+)/gi, ' ')
    .replace(/[()"]/g, ' ')
    .replace(/\s+OR\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
