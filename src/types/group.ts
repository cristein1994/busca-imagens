export type Contact = {
  id: string
  phone: string
  e164: string
  name: string
  notes: string
  source: 'paste' | 'csv' | 'manual'
  addedAt: string
}

export type WhatsAppGroup = {
  id: string
  name: string
  description: string
  inviteLink: string
  contacts: Contact[]
  updatedAt: string
  createdAt: string
}

export type ParseResult = {
  contacts: Omit<Contact, 'id' | 'addedAt'>[]
  ignored: string[]
  duplicatesInBatch: number
}
