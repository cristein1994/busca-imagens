export type PhoneKind =
  | 'MOBILE'
  | 'FIXED_LINE'
  | 'FIXED_LINE_OR_MOBILE'
  | 'TOLL_FREE'
  | 'PREMIUM_RATE'
  | 'VOIP'
  | 'PAGER'
  | 'UAN'
  | 'VOICEMAIL'
  | 'SHARED_COST'
  | 'PERSONAL_NUMBER'
  | 'UNKNOWN'

export type PhoneIntel = {
  raw: string
  e164: string
  national: string
  international: string
  uri: string
  country: string | undefined
  countryName: string
  countryCallingCode: string
  nationalNumber: string
  possible: boolean
  valid: boolean
  kind: PhoneKind
  kindLabel: string
  br?: {
    ddd: string
    state: string
    region: string
    cities: string[]
  }
}

export type PortalLink = {
  id: string
  label: string
  description: string
  href: string
  group: 'busca' | 'mensagens' | 'diretorios'
}

export type CarrierHint = {
  source: string
  carrier: string | null
  lineType: string | null
  location: string | null
  error?: string
}

export type SavedCase = {
  id: string
  title: string
  phone: string
  e164: string
  notes: string
  createdAt: string
  updatedAt: string
  snapshot: PhoneIntel
}
