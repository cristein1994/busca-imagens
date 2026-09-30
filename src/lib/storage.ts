import type { WhatsAppGroup } from '../types/group'

const STORAGE_KEY = 'grupolista.groups.v1'

export function loadGroups(): WhatsAppGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WhatsAppGroup[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveGroups(groups: WhatsAppGroup[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}
