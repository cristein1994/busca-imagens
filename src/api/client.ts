import type { ChatResponse, SearchResponse } from '../../shared/chat'

export async function searchChats(
  query: string,
  type: 'all' | 'channel' | 'group',
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, type })
  const response = await fetch(`/api/search?${params}`, { signal })
  if (!response.ok) throw new Error('Search failed. Try again in a moment.')
  return response.json() as Promise<SearchResponse>
}

export async function loadChat(username: string, signal?: AbortSignal): Promise<ChatResponse> {
  const params = new URLSearchParams({ username })
  const response = await fetch(`/api/chat?${params}`, { signal })
  const body = (await response.json()) as ChatResponse & { error?: string }
  if (!response.ok) throw new Error(body.error || 'Could not open that chat.')
  return body
}
