import type { GalleryItem } from '../types/generator'

const KEY = 'soulforge-gallery-v1'
const AGE_KEY = 'soulforge-age-ok'
const MAX = 60

export function loadGallery(): GalleryItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GalleryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveGallery(items: GalleryItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)))
}

export function addToGallery(item: GalleryItem): GalleryItem[] {
  const next = [item, ...loadGallery().filter((g) => g.id !== item.id)].slice(
    0,
    MAX,
  )
  saveGallery(next)
  return next
}

export function removeFromGallery(id: string): GalleryItem[] {
  const next = loadGallery().filter((g) => g.id !== id)
  saveGallery(next)
  return next
}

export function clearGallery() {
  saveGallery([])
}

export function isAgeVerified(): boolean {
  return localStorage.getItem(AGE_KEY) === '1'
}

export function setAgeVerified() {
  localStorage.setItem(AGE_KEY, '1')
}
