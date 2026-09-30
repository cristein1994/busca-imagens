import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js/max'
import { lookupBrDdd } from './brDdd'
import type { PhoneIntel, PhoneKind } from './types'

const KIND_LABEL: Record<PhoneKind, string> = {
  MOBILE: 'Móvel',
  FIXED_LINE: 'Fixo',
  FIXED_LINE_OR_MOBILE: 'Fixo ou móvel',
  TOLL_FREE: 'Gratuito / 0800',
  PREMIUM_RATE: 'Tarifa premium',
  VOIP: 'VoIP',
  PAGER: 'Pager',
  UAN: 'UAN',
  VOICEMAIL: 'Correio de voz',
  SHARED_COST: 'Custo compartilhado',
  PERSONAL_NUMBER: 'Número pessoal',
  UNKNOWN: 'Desconhecido',
}

const COUNTRY_NAMES: Record<string, string> = {
  BR: 'Brasil',
  US: 'Estados Unidos',
  PT: 'Portugal',
  AR: 'Argentina',
  PY: 'Paraguai',
  UY: 'Uruguai',
  CL: 'Chile',
  CO: 'Colômbia',
  MX: 'México',
  ES: 'Espanha',
  GB: 'Reino Unido',
  DE: 'Alemanha',
  FR: 'França',
  IT: 'Itália',
  CA: 'Canadá',
  JP: 'Japão',
  CN: 'China',
  IN: 'Índia',
  AU: 'Austrália',
}

function asKind(value: string | undefined): PhoneKind {
  if (!value) return 'UNKNOWN'
  if (value in KIND_LABEL) return value as PhoneKind
  return 'UNKNOWN'
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** Aceita BR sem +55 (10–11 dígitos) e E.164 com + ou 00. */
export function normalizeInput(raw: string, defaultCountry: CountryCode = 'BR'): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('+')) return trimmed
  if (/^00\d+/.test(trimmed)) return `+${trimmed.slice(2)}`

  const digits = digitsOnly(trimmed)
  if (defaultCountry === 'BR') {
    if (digits.length === 10 || digits.length === 11) return `+55${digits}`
    if (digits.length === 12 || digits.length === 13) {
      if (digits.startsWith('55')) return `+${digits}`
    }
  }
  return trimmed
}

export function analyzePhone(
  rawInput: string,
  defaultCountry: CountryCode = 'BR',
): PhoneIntel | { error: string } {
  const raw = rawInput.trim()
  if (!raw) return { error: 'Informe um número de telefone.' }

  const normalized = normalizeInput(raw, defaultCountry)
  const parsed = parsePhoneNumberFromString(normalized, defaultCountry)

  if (!parsed) {
    return {
      error:
        'Não foi possível interpretar o número. Use formato internacional (+5511999999999) ou DDD+número BR.',
    }
  }

  const kind = asKind(parsed.getType())
  const country = parsed.country
  const nationalNumber = parsed.nationalNumber
  const br =
    country === 'BR' ? (() => {
      const ddd = lookupBrDdd(nationalNumber)
      return ddd
        ? {
            ddd: ddd.ddd,
            state: ddd.state,
            region: ddd.region,
            cities: ddd.cities,
          }
        : undefined
    })() : undefined

  return {
    raw,
    e164: parsed.format('E.164'),
    national: parsed.formatNational(),
    international: parsed.formatInternational(),
    uri: parsed.getURI(),
    country,
    countryName: country
      ? COUNTRY_NAMES[country] ?? country
      : 'Não identificado',
    countryCallingCode: parsed.countryCallingCode || (country ? getCountryCallingCode(country) : ''),
    nationalNumber,
    possible: parsed.isPossible(),
    valid: parsed.isValid(),
    kind,
    kindLabel: KIND_LABEL[kind],
    br,
  }
}

export function searchVariants(intel: PhoneIntel): string[] {
  const digits = digitsOnly(intel.e164)
  const national = digitsOnly(intel.nationalNumber)
  const variants = new Set<string>([
    intel.e164,
    intel.international,
    intel.national,
    digits,
    national,
    `"${intel.e164}"`,
    `"${intel.national}"`,
  ])
  if (intel.country === 'BR' && national.length >= 10) {
    const ddd = national.slice(0, 2)
    const local = national.slice(2)
    variants.add(`(${ddd}) ${local}`)
    variants.add(`${ddd}${local}`)
    variants.add(`0${ddd}${local}`)
  }
  return [...variants]
}
