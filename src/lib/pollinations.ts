import { aspectToSize, buildFullPrompt } from './promptBuilder'
import type { GenerationRequest } from '../types/generator'

const IMAGE_BASE = 'https://image.pollinations.ai/prompt'
const TEXT_BASE = 'https://text.pollinations.ai'

function tokenQuery(): string {
  const token = import.meta.env.VITE_POLLINATIONS_TOKEN as string | undefined
  return token ? `&token=${encodeURIComponent(token)}` : ''
}

export function buildImageUrl(
  req: GenerationRequest,
  opts?: { imageUrl?: string },
): { url: string; prompt: string; width: number; height: number } {
  const prompt = buildFullPrompt(req)
  const { width, height } = aspectToSize(req.aspect)
  const seed = req.seed || Math.floor(Math.random() * 1_000_000)

  const model =
    req.imageModel ||
    (import.meta.env.VITE_IMAGE_MODEL as string | undefined) ||
    'chroma'

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model,
    nologo: 'true',
    // Liberar NSFW — equivalente ao SoulGen free com NSFW on
    safe: 'false',
  })

  // enhance costuma ajudar no flux; no chroma/turbo evita
  if (model === 'flux' || model.startsWith('black-forest-labs/')) {
    params.set('enhance', 'true')
  }

  if (opts?.imageUrl) {
    params.set('image', opts.imageUrl)
  }

  const url = `${IMAGE_BASE}/${encodeURIComponent(prompt)}?${params.toString()}${tokenQuery()}`

  return { url, prompt, width, height }
}

export async function generateImage(
  req: GenerationRequest,
  opts?: { imageUrl?: string; signal?: AbortSignal },
): Promise<{
  blobUrl: string
  remoteUrl: string
  prompt: string
  width: number
  height: number
  seed: number
}> {
  const seed = req.seed || Math.floor(Math.random() * 1_000_000)
  const withSeed = { ...req, seed }
  const { url, prompt, width, height } = buildImageUrl(withSeed, opts)

  const res = await fetch(url, { signal: opts?.signal })
  if (!res.ok) {
    throw new Error(`Falha na geração (${res.status}). Tente outro prompt ou seed.`)
  }

  const blob = await res.blob()
  if (!blob.type.startsWith('image/') && blob.size < 1000) {
    throw new Error('Resposta inválida do gerador. Tente novamente.')
  }

  const blobUrl = URL.createObjectURL(blob)
  return { blobUrl, remoteUrl: url, prompt, width, height, seed }
}

export async function chatWithCharacter(
  messages: { role: string; content: string }[],
  characterBrief: string,
  signal?: AbortSignal,
): Promise<string> {
  const system = [
    'You are an adult AI companion roleplay character (18+ only).',
    'Stay in character. NSFW talk is allowed if the user asks.',
    'Never involve minors. Reply in the same language as the user.',
    `Character: ${characterBrief}`,
  ].join(' ')

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Character'}: ${m.content}`)
    .join('\n')

  const prompt = `${system}\n\nConversation:\n${transcript}\nCharacter:`

  const params = new URLSearchParams({
    model: 'openai',
    temperature: '0.9',
  })

  const res = await fetch(
    `${TEXT_BASE}/${encodeURIComponent(prompt)}?${params.toString()}${tokenQuery()}`,
    { signal },
  )

  if (!res.ok) {
    throw new Error(`Chat falhou (${res.status})`)
  }

  return (await res.text()).trim()
}

export function downloadBlobUrl(blobUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  a.click()
}
