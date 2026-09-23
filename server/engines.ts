import type { EngineInfo, MediaFilter, Network } from '../shared/contracts.ts'
import {
  archiveHits,
  bingHits,
  dailymotionHits,
  flickrHits,
  htmlHits,
  nasaHits,
  openverseHits,
  pipedHits,
  redditHits,
  sepiasearchHits,
  wikimediaHits,
} from './sources.ts'
import type { RawHit } from './parse.ts'

export type EngineRun = {
  torProxy: string | null
  timeoutMs: number
  query: string
  media: MediaFilter
  nsfw: boolean
}

export type EngineDef = EngineInfo & {
  clearnet: ((query: string, media: MediaFilter, nsfw: boolean) => string) | null
  onion: ((query: string, media: MediaFilter, nsfw: boolean) => string) | null
  run: (ctx: EngineRun, target: string, viaTor: boolean) => Promise<RawHit[]>
}

function withParams(base: string, params: Record<string, string>): string {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

function safe(nsfw: boolean, strict: string, loose: string): string {
  return nsfw ? loose : strict
}

const surfaceHtml = (
  partial: Omit<EngineDef, 'network' | 'group' | 'clearnet' | 'onion' | 'run'> & {
    url: (query: string, media: MediaFilter, nsfw: boolean) => string
  },
): EngineDef => ({
  ...partial,
  network: 'surface',
  group: 'Surface',
  clearnet: partial.url,
  onion: null,
  run: (ctx, target) => htmlHits(target, ctx.media, { torProxy: null, timeoutMs: ctx.timeoutMs }),
})

const onionHtml = (
  partial: Omit<EngineDef, 'network' | 'group' | 'run'> & { indexes: string },
): EngineDef => ({
  ...partial,
  network: 'onion',
  group: partial.clearnet ? 'Onion com espelho' : 'Onion',
  run: (ctx, target, viaTor) =>
    htmlHits(target, ctx.media, { torProxy: viaTor ? ctx.torProxy : null, timeoutMs: ctx.timeoutMs }),
})

export const ENGINES: EngineDef[] = [
  surfaceHtml({
    id: 'google',
    name: 'Google',
    indexes: 'Web, imagens e vídeos. Dorks completos.',
    url: (query, media, nsfw) => {
      const base = 'https://www.google.com/search'
      const params: Record<string, string> = { q: query, safe: safe(nsfw, 'active', 'off'), hl: 'pt-BR' }
      if (media === 'image') params.tbm = 'isch'
      if (media === 'video') params.tbm = 'vid'
      return withParams(base, params)
    },
  }),
  {
    id: 'bing',
    name: 'Bing',
    network: 'surface',
    group: 'Surface',
    indexes: 'Imagens e vídeos, com URL direta quando o HTML traz.',
    clearnet: (query, media, nsfw) => {
      const vertical = media === 'video' ? 'videos' : 'images'
      return `https://www.bing.com/${vertical}/search?q=${encodeURIComponent(query)}&safesearch=${safe(nsfw, 'strict', 'off')}`
    },
    onion: null,
    run: (ctx) => bingHits(ctx.query, ctx.media, ctx.nsfw, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  surfaceHtml({
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    indexes: 'Imagens, vídeos e web sem conta.',
    url: (query, media, nsfw) => {
      const params: Record<string, string> = { q: query, kp: safe(nsfw, '1', '-2') }
      if (media === 'image') {
        params.iax = 'images'
        params.ia = 'images'
      } else if (media === 'video') {
        params.iax = 'videos'
        params.ia = 'videos'
      }
      return withParams('https://duckduckgo.com/', params)
    },
  }),
  surfaceHtml({
    id: 'brave',
    name: 'Brave',
    indexes: 'Web e imagens.',
    url: (query, media, nsfw) => {
      const path = media === 'image' ? '/images' : media === 'video' ? '/videos' : '/search'
      return withParams(`https://search.brave.com${path}`, {
        q: query,
        safesearch: safe(nsfw, 'strict', 'off'),
      })
    },
  }),
  surfaceHtml({
    id: 'yandex',
    name: 'Yandex',
    indexes: 'Imagens e vídeos.',
    url: (query, media) => {
      const path = media === 'video' ? 'https://yandex.com/video/search' : 'https://yandex.com/images/search'
      return withParams(path, { text: query })
    },
  }),
  surfaceHtml({
    id: 'yahoo',
    name: 'Yahoo',
    indexes: 'Imagens e web.',
    url: (query, media) => {
      const base = media === 'video'
        ? 'https://video.search.yahoo.com/search/video'
        : 'https://images.search.yahoo.com/search/images'
      return withParams(base, { p: query })
    },
  }),
  surfaceHtml({
    id: 'startpage',
    name: 'Startpage',
    indexes: 'Resultados do Google com proxy de privacidade.',
    url: (query, media) => withParams('https://www.startpage.com/sp/search', {
      query,
      cat: media === 'video' ? 'video' : media === 'image' ? 'images' : 'web',
    }),
  }),
  surfaceHtml({
    id: 'mojeek',
    name: 'Mojeek',
    indexes: 'Índice próprio, sem perfil.',
    url: (query) => withParams('https://www.mojeek.com/search', { q: query }),
  }),
  surfaceHtml({
    id: 'qwant',
    name: 'Qwant',
    indexes: 'Imagens e web.',
    url: (query, media, nsfw) => withParams('https://www.qwant.com/', {
      q: query,
      t: media === 'video' ? 'videos' : media === 'image' ? 'images' : 'web',
      safesearch: safe(nsfw, '2', '0'),
    }),
  }),
  surfaceHtml({
    id: 'ecosia',
    name: 'Ecosia',
    indexes: 'Imagens e web.',
    url: (query, media) => {
      const path = media === 'image' ? '/images' : media === 'video' ? '/videos' : '/search'
      return withParams(`https://www.ecosia.org${path}`, { q: query })
    },
  }),
  surfaceHtml({
    id: 'swisscows',
    name: 'Swisscows',
    indexes: 'Web sem anúncio comportamental.',
    url: (query) => withParams('https://swisscows.com/web', { query }),
  }),
  surfaceHtml({
    id: 'metager',
    name: 'MetaGer',
    indexes: 'Metabusca alemã.',
    url: (query) => withParams('https://metager.org/meta/meta.ger3', { eingabe: query }),
  }),
  surfaceHtml({
    id: 'gibiru',
    name: 'Gibiru',
    indexes: 'Busca sem rastreamento.',
    url: (query) => withParams('https://gibiru.com/results.html', { q: query }),
  }),
  surfaceHtml({
    id: 'yep',
    name: 'Yep',
    indexes: 'Web e imagens.',
    url: (query, media) => withParams(media === 'image' ? 'https://yep.com/images' : 'https://yep.com/web', { q: query }),
  }),
  surfaceHtml({
    id: 'seznam',
    name: 'Seznam',
    indexes: 'Busca tcheca.',
    url: (query) => withParams('https://search.seznam.cz/', { q: query }),
  }),
  surfaceHtml({
    id: 'lycos',
    name: 'Lycos',
    indexes: 'Web clássica.',
    url: (query) => withParams('https://search.lycos.com/web/', { q: query }),
  }),
  surfaceHtml({
    id: 'dogpile',
    name: 'Dogpile',
    indexes: 'Metabusca.',
    url: (query) => withParams('https://www.dogpile.com/serp', { q: query }),
  }),
  surfaceHtml({
    id: 'ask',
    name: 'Ask',
    indexes: 'Web.',
    url: (query) => withParams('https://www.ask.com/web', { q: query }),
  }),
  surfaceHtml({
    id: 'aol',
    name: 'AOL',
    indexes: 'Web.',
    url: (query) => withParams('https://search.aol.com/aol/search', { q: query }),
  }),
  surfaceHtml({
    id: 'boardreader',
    name: 'BoardReader',
    indexes: 'Fóruns e discussões.',
    url: (query) => withParams('https://boardreader.com/s/', { q: query }),
  }),
  surfaceHtml({
    id: 'baidu',
    name: 'Baidu',
    indexes: 'Imagens.',
    url: (query) => withParams('https://image.baidu.com/search/index', { tn: 'baiduimage', word: query }),
  }),
  surfaceHtml({
    id: 'naver',
    name: 'Naver',
    indexes: 'Imagens.',
    url: (query) => withParams('https://search.naver.com/search.naver', { where: 'image', query }),
  }),
  surfaceHtml({
    id: 'marginalia',
    name: 'Marginalia',
    indexes: 'Web independente, fora dos grandes índices.',
    url: (query) => withParams('https://marginalia-search.com/search', { query }),
  }),
  {
    id: 'openverse',
    name: 'Openverse',
    network: 'surface',
    group: 'Acervos',
    indexes: 'Fotos com licença aberta.',
    clearnet: (query) => `https://openverse.org/search/image?q=${encodeURIComponent(query)}`,
    onion: null,
    run: (ctx) => openverseHits(ctx.query, ctx.media, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  {
    id: 'wikimedia',
    name: 'Wikimedia Commons',
    network: 'surface',
    group: 'Acervos',
    indexes: 'Arquivos por nome, descrição e metadados públicos.',
    clearnet: (query) => `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(query)}`,
    onion: null,
    run: (ctx) => wikimediaHits(ctx.query, ctx.media, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  {
    id: 'archive',
    name: 'Internet Archive',
    network: 'surface',
    group: 'Acervos',
    indexes: 'Imagens e filmes do acervo público.',
    clearnet: (query) => `https://archive.org/search?query=${encodeURIComponent(query)}`,
    onion: null,
    run: (ctx) => archiveHits(ctx.query, ctx.media, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  {
    id: 'flickr',
    name: 'Flickr',
    network: 'surface',
    group: 'Acervos',
    indexes: 'Feed público por tags.',
    clearnet: (query) => `https://www.flickr.com/search/?text=${encodeURIComponent(query)}`,
    onion: null,
    run: (ctx) => flickrHits(ctx.query, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  {
    id: 'nasa',
    name: 'NASA Images',
    network: 'surface',
    group: 'Acervos',
    indexes: 'Fotos e vídeos da NASA.',
    clearnet: (query) => `https://images.nasa.gov/search?q=${encodeURIComponent(query)}`,
    onion: null,
    run: (ctx) => nasaHits(ctx.query, ctx.media, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  {
    id: 'reddit',
    name: 'Reddit',
    network: 'surface',
    group: 'Acervos',
    indexes: 'Posts públicos. NSFW só com o interruptor ligado.',
    clearnet: (query, _media, nsfw) =>
      `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&include_over_18=${nsfw ? 'on' : 'off'}`,
    onion: null,
    run: (ctx) => redditHits(ctx.query, ctx.nsfw, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    network: 'surface',
    group: 'Vídeo',
    indexes: 'Vídeos públicos.',
    clearnet: (query) => `https://www.dailymotion.com/search/${encodeURIComponent(query)}/videos`,
    onion: null,
    run: (ctx) => dailymotionHits(ctx.query, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  {
    id: 'sepiasearch',
    name: 'SepiaSearch',
    network: 'surface',
    group: 'Vídeo',
    indexes: 'Vídeos de instâncias PeerTube.',
    clearnet: (query) => `https://sepiasearch.org/search?search=${encodeURIComponent(query)}`,
    onion: null,
    run: (ctx) => sepiasearchHits(ctx.query, ctx.nsfw, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  {
    id: 'piped',
    name: 'Piped',
    network: 'surface',
    group: 'Vídeo',
    indexes: 'Vídeos públicos via instâncias Piped.',
    clearnet: (query) => `https://piped.video/results?search_query=${encodeURIComponent(query)}`,
    onion: null,
    run: (ctx) => pipedHits(ctx.query, { torProxy: null, timeoutMs: ctx.timeoutMs }),
  },
  onionHtml({
    id: 'ahmia',
    name: 'Ahmia',
    indexes: 'Serviços .onion. Filtra material de abuso.',
    clearnet: (query) => `https://ahmia.fi/search/?q=${encodeURIComponent(query)}`,
    onion: (query) =>
      `http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion/search/?q=${encodeURIComponent(query)}`,
  }),
  onionHtml({
    id: 'torch',
    name: 'Torch',
    indexes: 'Índice .onion amplo. Endereço publicado pelo próprio Torch.',
    clearnet: (query) => `https://torch.cx/search/?q=${encodeURIComponent(query)}`,
    onion: (query) =>
      `http://torchsfe235y6d7wguqo6g4ucxqq7frrm5fpgkjssdhthsq4kjmmisid.onion/search/?q=${encodeURIComponent(query)}`,
  }),
  onionHtml({
    id: 'haystak',
    name: 'Haystak',
    indexes: 'Índice .onion. O host pode ter rotacionado.',
    clearnet: null,
    onion: (query) =>
      `http://haystak5njsmn2hqkewecpaxetahtwhsbsa64jom2k22z5afxhnpxfid.onion/?q=${encodeURIComponent(query)}`,
  }),
  onionHtml({
    id: 'onionland',
    name: 'OnionLand',
    indexes: 'Tor e I2P. O host pode ter rotacionado.',
    clearnet: null,
    onion: (query) =>
      `http://3bbad7fauom4d6sgppalyqddsqbf5u5p56b5k5uk2zxsy3d6ey2jobad.onion/search?q=${encodeURIComponent(query)}`,
  }),
  onionHtml({
    id: 'excavator',
    name: 'Excavator',
    indexes: 'Índice .onion. O host pode ter rotacionado.',
    clearnet: null,
    onion: (query) =>
      `http://2fd6cemt4gmccflhm6imvdfvli3nf7zn6rfrwpsy7uhxrgbypvwf5fad.onion/search?q=${encodeURIComponent(query)}`,
  }),
  onionHtml({
    id: 'tor66',
    name: 'Tor66',
    indexes: 'Índice .onion citado em diretórios públicos. Pode estar fora.',
    clearnet: null,
    onion: (query) =>
      `http://tor66sewebgixwhcqfnp5inzp5x5uohhdy3kvtnyfxc2e5mxiuh34iid.onion/search?q=${encodeURIComponent(query)}`,
  }),
  onionHtml({
    id: 'phobos',
    name: 'Phobos',
    indexes: 'Índice .onion citado em diretórios públicos. Pode estar fora.',
    clearnet: null,
    onion: (query) =>
      `http://phobosxilamwcg75xt22id7aywkzol6q6rfl2flipcqoc4e4ahima5id.onion/?q=${encodeURIComponent(query)}`,
  }),
  onionHtml({
    id: 'duckduckgo-onion',
    name: 'DuckDuckGo .onion',
    indexes: 'Endpoint oficial. Índice da surface, consulta fica dentro do Tor.',
    clearnet: (query, media, nsfw) => {
      const params: Record<string, string> = { q: query, kp: safe(nsfw, '1', '-2') }
      if (media === 'image') {
        params.iax = 'images'
        params.ia = 'images'
      }
      return withParams('https://duckduckgo.com/', params)
    },
    onion: (query, media, nsfw) => {
      const params: Record<string, string> = { q: query, kp: safe(nsfw, '1', '-2') }
      if (media === 'image') {
        params.iax = 'images'
        params.ia = 'images'
      } else if (media === 'video') {
        params.iax = 'videos'
        params.ia = 'videos'
      }
      return withParams('https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/', params)
    },
  }),
  onionHtml({
    id: 'brave-onion',
    name: 'Brave .onion',
    indexes: 'Endpoint oficial publicado no diretório real-world-onion-sites.',
    clearnet: (query, media, nsfw) => {
      const path = media === 'image' ? '/images' : '/search'
      return withParams(`https://search.brave.com${path}`, { q: query, safesearch: safe(nsfw, 'strict', 'off') })
    },
    onion: (query, media, nsfw) => {
      const path = media === 'image' ? '/images' : '/search'
      return withParams(`https://search.brave4u7jddbv7cyviptqjc7jusxh72uik7zt6adtckl5f4nwy2v72qd.onion${path}`, {
        q: query,
        safesearch: safe(nsfw, 'strict', 'off'),
      })
    },
  }),
  onionHtml({
    id: 'metager-onion',
    name: 'MetaGer .onion',
    indexes: 'Endpoint oficial publicado em metager.org/tor.',
    clearnet: (query) => withParams('https://metager.org/meta/meta.ger3', { eingabe: query }),
    onion: (query) =>
      withParams('http://metagerv65pwclop2rsfzg4jwowpavpwd6grhhlvdgsswvo6ii4akgyd.onion/meta/meta.ger3', {
        eingabe: query,
      }),
  }),
]

const surfaceCount = ENGINES.filter((engine) => engine.network === 'surface').length
const onionCount = ENGINES.filter((engine) => engine.network === 'onion').length
if (surfaceCount < 30 || onionCount < 10) {
  throw new Error(`Catálogo incompleto: ${surfaceCount} surface, ${onionCount} onion`)
}

export function engineInfo(engine: EngineDef): EngineInfo {
  return {
    id: engine.id,
    name: engine.name,
    network: engine.network as Network,
    group: engine.group,
    indexes: engine.indexes,
  }
}

export function searchTarget(engine: EngineDef, ctx: EngineRun, viaTor: boolean): string | null {
  if (engine.network === 'onion') {
    if (viaTor && engine.onion) return engine.onion(ctx.query, ctx.media, ctx.nsfw)
    if (!viaTor && engine.clearnet) return engine.clearnet(ctx.query, ctx.media, ctx.nsfw)
    return engine.onion ? engine.onion(ctx.query, ctx.media, ctx.nsfw) : null
  }
  return engine.clearnet ? engine.clearnet(ctx.query, ctx.media, ctx.nsfw) : null
}
