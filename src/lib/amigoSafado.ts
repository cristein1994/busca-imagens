import type { GpProfile } from '../types/gp'
import { positionLabel } from './filter'

export interface ChatMessage {
  id: string
  role: 'amigo' | 'voce'
  text: string
}

function isAtivo(p: GpProfile): boolean {
  return p.position === 'ativo' || p.position === 'ativo-liberal'
}

function servesHomens(p: GpProfile): boolean {
  return p.serves.some((s) => {
    const t = s.toLowerCase()
    return t.includes('homens') || t.includes('homem') || t === 'gays' || t === 'h'
  })
}

function scoreForMamar(p: GpProfile, cityHint?: string): number {
  let s = p.sizeCm * 10
  if (isAtivo(p)) s += 40
  if (p.position === 'versatil') s -= 25
  if (p.position === 'passivo') s -= 50
  if (servesHomens(p)) s += 20
  else s -= 40
  if (cityHint && p.city.toLowerCase().includes(cityHint.toLowerCase())) s += 30
  if (p.tags.includes('pra-mamar') || p.tags.includes('dotado')) s += 10
  if (p.age < 21) s = -999
  return s
}

export function pickTop(
  profiles: GpProfile[],
  opts: { city?: string; onlyAtivo?: boolean; minCm?: number; n?: number },
): GpProfile[] {
  const city = opts.city || 'Uberaba'
  const minCm = opts.minCm ?? 16
  const onlyAtivo = opts.onlyAtivo ?? true
  const n = opts.n ?? 5

  return [...profiles]
    .filter((p) => p.age >= 21)
    .filter((p) => p.sizeCm >= minCm)
    .filter((p) => (onlyAtivo ? isAtivo(p) : true))
    .filter((p) => servesHomens(p))
    .sort((a, b) => scoreForMamar(b, city) - scoreForMamar(a, city))
    .slice(0, n)
}

function describe(p: GpProfile, rank: number): string {
  const vibe = isAtivo(p)
    ? 'macho pra tu ajoelhar e mamar sem frescura'
    : positionLabel(p.position).toLowerCase()
  return `${rank}) **${p.name}** — ${p.sizeCm} cm, ${positionLabel(p.position)}, ${p.age}a, ${p.city}. ${vibe}.${p.whatsapp ? ` Zap no perfil.` : ''} ${p.notes || ''}`
}

export function amigoReply(
  userText: string,
  catalog: GpProfile[],
  scrapeInfo?: { count: number; errors: string[] },
): string {
  const t = userText.toLowerCase()

  if (/scrap|atualiz|puxa|web|anúncio|anuncio/.test(t)) {
    if (scrapeInfo) {
      const usedSnap = scrapeInfo.errors.some((e) => /snapshot/i.test(e))
      return scrapeInfo.count
        ? `Puxei a putaria${usedSnap ? ' do snapshot (Cloudflare bloqueou o live)' : ' da web'}, amor. Entrou **${scrapeInfo.count}** anúncio(s) novo(s) no radar.${scrapeInfo.errors.length && !usedSnap ? ` Alguns sites deram erro (${scrapeInfo.errors.length}).` : ''} Quer o ranking pra mamar agora?`
        : `Tentei scrapar, mas veio pouco/nada. ${scrapeInfo.errors[0] || 'Roda com npm run dev (proxy).'} Enquanto isso a gente goza com o catálogo seed — manda “top 5 pra mamar”.`
    }
    return 'Manda eu **atualizar da web** pelo botão, ou escreve “scrapa aí” que eu te guio. Quero encher tua boca de opção boa.'
  }

  const wantsMamar = /mamar|chupar|oral|boi|pau|dotado|enorme|grosso/.test(t)
  const onlyAtivo = !/vers[aá]til|passivo/.test(t)
  const city = /uberl[aâ]ndia/.test(t)
    ? 'Uberlândia'
    : /ituiutaba/.test(t)
      ? 'Ituiutaba'
      : 'Uberaba'
  const minCm = /enorme|22|21|20/.test(t) ? 19 : /17|18/.test(t) ? 17 : 16

  if (wantsMamar || /top|ranking|melhor|escolhe|indica|quero/.test(t)) {
    const top = pickTop(catalog, { city, onlyAtivo, minCm, n: 5 })
    if (!top.length) {
      return `Porra, com esse filtro (${city}, ${onlyAtivo ? 'só ativo' : 'qualquer posição'}, ${minCm}cm+) tá seco. Afrouxa o cm ou deixa eu scrapar a web de novo.`
    }
    const lines = top.map((p, i) => describe(p, i + 1))
    return [
      `Olha só o cardápio pra tu mamar, safado — filtro **${city}**, ${onlyAtivo ? 'só ativo' : 'misto'}, ${minCm}cm+:`,
      '',
      ...lines,
      '',
      city === 'Uberaba' && top.every((p) => p.city !== 'Uberaba')
        ? 'Obs: Uberaba tá magra de ativo dotado; o ranking puxou a região.'
        : 'Clica no card, abre o zap e fala que quer mamar. Sem Pix adiantado, né?',
      '',
      'Quer que eu escolha **um** e monte a mensagem puta pra mandar?',
    ].join('\n')
  }

  if (/mensagem|zap|whats|falar|texto/.test(t)) {
    const top = pickTop(catalog, { city: 'Uberaba', onlyAtivo: true, minCm: 17, n: 1 })[0]
    if (!top) return 'Não achei ativo bom pra montar zap. Scrapa a web ou muda o filtro.'
    return [
      `Manda pro **${top.name}** (${top.sizeCm} cm, ${top.city}):`,
      '',
      `\`\`\`\nFala ${top.name}, vi teu anúncio. Sou gay, 21+, safado.\nQuero te mamar — confirma que é só ativo e o tamanho real?\nSem Pix adiantado. Bora?\n\`\`\``,
      '',
      'Se ele mandar foto do pau, me mostra a descrição que eu te digo se vale ajoelhar.',
    ].join('\n')
  }

  if (/oi|ola|olá|eae|eai|fala|hey/.test(t)) {
    return 'Eae puto. Sou teu amigo gay safado do BoyRadar. Manda: “top 5 pra mamar em Uberaba”, “scrapa a web”, ou “monta zap pro Biel”. Vou te ajudar a escolher boy pelo anúncio sem frescura.'
  }

  return [
    'Não entendi o tesão completo, mas eu tô aqui pra isso. Experimenta:',
    '• **top 5 pra mamar**',
    '• **ativo dotado em Uberlândia**',
    '• **scrapa a web**',
    '• **monta mensagem de zap**',
    '',
    `Catálogo agora: **${catalog.filter((p) => p.age >= 21).length}** boys 21+.`,
  ].join('\n')
}

export function welcomeMessage(): string {
  return 'Eae, putinho. Eu sou o **Amigo Safado** do BoyRadar — teu brother gay pra escolher GP pelos anúncios. Quer ranking pra mamar, scrap da web, ou mensagem pronta pro zap? Manda a real.'
}
