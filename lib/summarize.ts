import type { OsintResult, OsintSummary } from './types'

const STOP = new Set(
  `a o os as um uma uns umas de da do das dos e em no na nos nas por para com sem sob sobre
the of and to in for on at by from or an is are was were be as it this that with not
que se um uma para com não nao por mais como dos das uma`.split(/\s+/),
)

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length >= 48 && sentence.length <= 320)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function summarize(query: string, results: OsintResult[], laneLabel: string): OsintSummary {
  const terms = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 2 && !STOP.has(term))

  const ranked: { text: string; score: number }[] = []
  for (const result of results) {
    const chunks = [
      { text: result.scrapedExcerpt ?? '', bonus: 3 },
      { text: result.snippet, bonus: 1 },
    ]
    for (const chunk of chunks) {
      for (const sentence of sentencesOf(chunk.text)) {
        const low = sentence.toLowerCase()
        let score = chunk.bonus
        for (const term of terms) {
          if (low.includes(term)) score += 2
        }
        ranked.push({ text: sentence, score })
      }
    }
  }

  ranked.sort((a, b) => b.score - a.score)
  const picked: string[] = []
  for (const item of ranked) {
    const key = item.text.slice(0, 90).toLowerCase()
    if (picked.some((sentence) => sentence.slice(0, 90).toLowerCase() === key)) continue
    picked.push(item.text)
    if (picked.length >= 5) break
  }

  const domainCounts = new Map<string, number>()
  const themeCounts = new Map<string, number>()
  for (const result of results) {
    const host = hostOf(result.url)
    domainCounts.set(host, (domainCounts.get(host) ?? 0) + 1)
    const words = `${result.title} ${result.snippet}`
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 3 && !STOP.has(word) && !terms.includes(word))
    for (const word of words) themeCounts.set(word, (themeCounts.get(word) ?? 0) + 1)
  }

  const topDomains = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([host, count]) => ({ host, count }))

  const themes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word)

  const lead = `${laneLabel}: ${results.length} resultados raspados para “${query}”.`
  const brief = picked.length > 0 ? `${lead} ${picked.join(' ')}` : `${lead} Os trechos coletados são curtos demais para um resumo extrativo; a lista abaixo é a fonte.`

  return {
    headline: `Resumo · ${results.length} fontes`,
    brief,
    themes,
    topDomains,
  }
}
