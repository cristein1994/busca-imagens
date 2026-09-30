import type { CarrierHint, PhoneIntel } from './types'

const KEY = import.meta.env.VITE_ABSTRACT_PHONE_KEY as string | undefined

export function hasAbstractKey(): boolean {
  return Boolean(KEY && KEY.trim() && !KEY.includes('sua_chave'))
}

/** Lookup opcional via AbstractAPI (formato/operadora públicos). */
export async function fetchCarrierHint(intel: PhoneIntel): Promise<CarrierHint> {
  if (!hasAbstractKey()) {
    return {
      source: 'AbstractAPI',
      carrier: null,
      lineType: null,
      location: null,
      error: 'Chave VITE_ABSTRACT_PHONE_KEY não configurada — pulado.',
    }
  }

  const url = new URL('https://phonevalidation.abstractapi.com/v1/')
  url.searchParams.set('api_key', KEY!.trim())
  url.searchParams.set('phone', intel.e164)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) {
      return {
        source: 'AbstractAPI',
        carrier: null,
        lineType: null,
        location: null,
        error: `HTTP ${res.status}`,
      }
    }
    const data = (await res.json()) as {
      carrier?: string
      type?: string
      location?: string
      valid?: boolean
      error?: { message?: string }
    }
    if (data.error?.message) {
      return {
        source: 'AbstractAPI',
        carrier: null,
        lineType: null,
        location: null,
        error: data.error.message,
      }
    }
    return {
      source: 'AbstractAPI',
      carrier: data.carrier || null,
      lineType: data.type || null,
      location: data.location || null,
    }
  } catch (err) {
    return {
      source: 'AbstractAPI',
      carrier: null,
      lineType: null,
      location: null,
      error: err instanceof Error ? err.message : 'Falha de rede',
    }
  }
}
