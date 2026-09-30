import type {
  RelatedPhotoData,
  UnsplashPhoto,
  UnsplashRelatedResponse,
  UnsplashSearchResponse,
} from '../types/unsplash'

const API_BASE = 'https://api.unsplash.com'

function authHeaders(accessKey: string): HeadersInit {
  return {
    Authorization: `Client-ID ${accessKey}`,
    'Accept-Version': 'v1',
  }
}

function mapApiError(status: number, fallback: string): Error {
  if (status === 401) {
    return new Error('Chave da API inválida. Verifique o arquivo .env.')
  }
  if (status === 403) {
    return new Error('Limite de requisições excedido. Tente novamente mais tarde.')
  }
  if (status === 404) {
    return new Error('Recurso não encontrado na API do Unsplash.')
  }
  return new Error(`${fallback} (${status}).`)
}

export function getAccessKey(): string | undefined {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (typeof key !== 'string' || !key.trim() || key === 'sua_access_key_aqui') {
    return undefined
  }
  return key.trim()
}

export function hasAccessKey(): boolean {
  return Boolean(getAccessKey())
}

export async function searchPhotos(
  query: string,
  page = 1,
  perPage = 24,
): Promise<UnsplashPhoto[]> {
  const accessKey = getAccessKey()
  if (!accessKey) {
    throw new Error('Chave da API Unsplash não configurada.')
  }

  const params = new URLSearchParams({
    query: query.trim(),
    page: String(page),
    per_page: String(perPage),
  })

  const response = await fetch(`${API_BASE}/search/photos?${params}`, {
    headers: authHeaders(accessKey),
  })

  if (!response.ok) {
    throw mapApiError(response.status, 'Erro ao buscar imagens')
  }

  const data = (await response.json()) as UnsplashSearchResponse
  return data.results
}

export async function getPhotoDetails(id: string): Promise<UnsplashPhoto> {
  const accessKey = getAccessKey()
  if (!accessKey) {
    throw new Error('Chave da API Unsplash não configurada.')
  }

  const response = await fetch(`${API_BASE}/photos/${encodeURIComponent(id)}`, {
    headers: authHeaders(accessKey),
  })

  if (!response.ok) {
    throw mapApiError(response.status, 'Erro ao carregar detalhes da imagem')
  }

  return (await response.json()) as UnsplashPhoto
}

export async function getRelatedPhotos(id: string): Promise<UnsplashPhoto[]> {
  const accessKey = getAccessKey()
  if (!accessKey) {
    throw new Error('Chave da API Unsplash não configurada.')
  }

  const response = await fetch(
    `${API_BASE}/photos/${encodeURIComponent(id)}/related`,
    { headers: authHeaders(accessKey) },
  )

  if (!response.ok) {
    throw mapApiError(response.status, 'Erro ao carregar imagens relacionadas')
  }

  const data = (await response.json()) as UnsplashRelatedResponse
  return data.results ?? []
}

/** Carrega metadados públicos + fotos relacionadas de uma imagem. */
export async function getRelatedPhotoData(id: string): Promise<RelatedPhotoData> {
  const [details, related] = await Promise.all([
    getPhotoDetails(id),
    getRelatedPhotos(id).catch(() => [] as UnsplashPhoto[]),
  ])

  return { details, related }
}
