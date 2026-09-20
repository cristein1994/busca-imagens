import type { UnsplashPhoto, UnsplashSearchResponse } from '../types/unsplash'

const API_BASE = 'https://api.unsplash.com'

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
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Chave da API inválida. Verifique o arquivo .env.')
    }
    if (response.status === 403) {
      throw new Error('Limite de requisições excedido. Tente novamente mais tarde.')
    }
    throw new Error(`Erro ao buscar imagens (${response.status}).`)
  }

  const data = (await response.json()) as UnsplashSearchResponse
  return data.results
}
