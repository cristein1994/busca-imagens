const HARD =
  /\b(loli|lolita|lolicon|shota|shotacon|jailbait|preteen|pre-teen|pedofil\w*|paedophil\w*|childporn|csam|underage|novinha|novinhas|novinho|novinhos)\b|pornografia infantil|porn infantil|child porn|crianca pelad|crianca nua|menor pelad|menor nua/i

const SEXUAL =
  /\b(porn\w*|nsfw|xxx|sexo|sexual|nua|nudes?|pelad\w*|hentai|erotic\w*|erotico\w*|onlyfans|buceta|penis|boobs?|pussy|anal|safad\w*|xvideos|pornhub|xnxx|redtube|spankbang)\b/i

const UNDER =
  /\b(child|children|kid|kids|minor|minors|teen|teens|teenager|teenagers|adolescente|adolescentes|crianca|criancas|infantil|bebe|baby|toddler|preteen|underage|novinha|novinho|menor|menores)\b|\b([0-9]|1[0-9]|20)\s?(yo|yr|yrs|years?\s+old|anos)\b/i

export function normalizeSearchText(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function isBlockedSearch(text: string, nsfw: boolean): boolean {
  const s = normalizeSearchText(text)
  if (!s.trim()) return false
  if (HARD.test(s)) return true
  if (SEXUAL.test(s) && UNDER.test(s)) return true
  if (nsfw && UNDER.test(s)) return true
  return false
}
