const BLOCKED: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(child\s*porn|csam|preteen|jailbait|underage\s*(porn|sex))\b/i, reason: 'Consulta recusada.' },
  { pattern: /\b(fullz|carding|cvv\s*shop|stolen\s+credit\s+cards?|dumps?\s+shop)\b/i, reason: 'Consulta recusada.' },
]

const RESULT_DROP = [
  /\b(child\s*porn|csam|preteen|jailbait)\b/i,
  /\b(fullz|carding|cvv)\b/i,
]

export function rejectQuery(query: string): string | null {
  for (const rule of BLOCKED) {
    if (rule.pattern.test(query)) return rule.reason
  }
  return null
}

export function allowResultText(text: string): boolean {
  return !RESULT_DROP.some((pattern) => pattern.test(text))
}
