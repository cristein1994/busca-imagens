import type { PhoneIntel, PortalLink } from './types'
import { searchVariants } from './phone'

function encode(value: string): string {
  return encodeURIComponent(value)
}

function digits(value: string): string {
  return value.replace(/\D/g, '')
}

export function buildPortals(intel: PhoneIntel): PortalLink[] {
  const e164 = intel.e164
  const bare = digits(e164)
  const national = digits(intel.nationalNumber)
  const primaryQuery = encode(e164)
  const quoted = encode(`"${e164}"`)
  const variants = searchVariants(intel)
    .slice(0, 4)
    .map((v) => encode(v))
    .join('%20OR%20')

  const links: PortalLink[] = [
    {
      id: 'google',
      label: 'Google',
      description: 'Busca web pelo E.164 e variantes',
      href: `https://www.google.com/search?q=${variants}`,
      group: 'busca',
    },
    {
      id: 'ddg',
      label: 'DuckDuckGo',
      description: 'Busca sem perfilagem agressiva',
      href: `https://duckduckgo.com/?q=${primaryQuery}`,
      group: 'busca',
    },
    {
      id: 'bing',
      label: 'Bing',
      description: 'Índice alternativo',
      href: `https://www.bing.com/search?q=${quoted}`,
      group: 'busca',
    },
    {
      id: 'yandex',
      label: 'Yandex',
      description: 'Bom para menções internacionais',
      href: `https://yandex.com/search/?text=${primaryQuery}`,
      group: 'busca',
    },
    {
      id: 'brave',
      label: 'Brave Search',
      description: 'Índice independente',
      href: `https://search.brave.com/search?q=${primaryQuery}`,
      group: 'busca',
    },
    {
      id: 'pastebin',
      label: 'Google · site:pastebin',
      description: 'Menções em pastes indexados',
      href: `https://www.google.com/search?q=${encode(`site:pastebin.com ${e164}`)}`,
      group: 'busca',
    },
    {
      id: 'github',
      label: 'GitHub Code',
      description: 'Número em repositórios públicos',
      href: `https://github.com/search?type=code&q=${encode(e164)}`,
      group: 'busca',
    },
    {
      id: 'reddit',
      label: 'Reddit',
      description: 'Discussões públicas',
      href: `https://www.reddit.com/search/?q=${primaryQuery}`,
      group: 'busca',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp (wa.me)',
      description: 'Abre chat — não revela se existe conta',
      href: `https://wa.me/${bare}`,
      group: 'mensagens',
    },
    {
      id: 'telegram',
      label: 'Telegram',
      description: 'Deep link t.me/+número (só se existir username público)',
      href: `https://t.me/+${bare}`,
      group: 'mensagens',
    },
    {
      id: 'signal',
      label: 'Signal Group Link check',
      description: 'Não resolve assinante; útil se o número aparecer em links públicos',
      href: `https://www.google.com/search?q=${encode(`"${e164}" signal`)}`,
      group: 'mensagens',
    },
    {
      id: 'truecaller',
      label: 'Truecaller Web',
      description: 'Página pública de busca (pode pedir login)',
      href: `https://www.truecaller.com/search/${(intel.country ?? 'br').toLowerCase()}/${national || bare}`,
      group: 'diretorios',
    },
    {
      id: 'numlookup',
      label: 'NumLookup',
      description: 'Lookup público de formato/país',
      href: `https://www.numlookup.com/${bare}`,
      group: 'diretorios',
    },
    {
      id: 'callapp',
      label: 'CallApp',
      description: 'Diretório público (cobertura variável)',
      href: `https://callapp.com/num/${bare}`,
      group: 'diretorios',
    },
  ]

  if (intel.country === 'BR') {
    links.push(
      {
        id: 'anatel-ddd',
        label: 'ANATEL · Códigos nacionais',
        description: 'Tabela oficial de DDD',
        href: 'https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais',
        group: 'diretorios',
      },
      {
        id: 'google-br',
        label: 'Google BR (aspas + DDD)',
        description: 'Busca com formato nacional BR',
        href: `https://www.google.com/search?q=${encode(`"${intel.national}"`)}&hl=pt-BR&gl=br`,
        group: 'busca',
      },
    )
  }

  return links
}

export const GROUP_LABEL: Record<PortalLink['group'], string> = {
  busca: 'Motores de busca',
  mensagens: 'Apps de mensagem',
  diretorios: 'Diretórios públicos',
}
