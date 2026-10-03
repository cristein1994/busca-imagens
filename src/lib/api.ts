export type HealthInfo = {
  ok: boolean
  model: string
  params: string
  license: string
  base: string
  spaces: string[]
  local_gpu: boolean
  note: string
}

export type GeneratePayload = {
  prompt: string
  negative_prompt: string
  seed: number
  width: number
  height: number
  guidance_scale: number
  num_inference_steps: number
}

export type GenerateResult = {
  ok: boolean
  model: string
  space: string
  elapsed_sec: number
  seed: number
  width: number
  height: number
  steps: number
  guidance_scale: number
  mime: string
  image_base64: string
  saved_as: string
}

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error('API offline')
  return res.json()
}

export async function generateImage(
  payload: GeneratePayload,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    let detail = `Erro ${res.status}`
    try {
      const body = await res.json()
      detail = body?.detail?.message || body?.detail || detail
      if (Array.isArray(body?.detail?.errors)) {
        detail += ` — ${body.detail.errors[0]}`
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }

  return res.json()
}

export function toDataUrl(mime: string, b64: string) {
  return `data:${mime};base64,${b64}`
}
