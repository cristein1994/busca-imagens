const STORAGE_KEY = 'clientes-local.v1'

import type { ClientRecord } from '../types/client'

export function loadClients(): ClientRecord[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ClientRecord[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveClients(records: ClientRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function clearClients(): void {
  localStorage.removeItem(STORAGE_KEY)
}
