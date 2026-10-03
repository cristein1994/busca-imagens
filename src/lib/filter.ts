import type { GpFilters, GpProfile } from '../types/gp'

export function defaultFilters(): GpFilters {
  return {
    query: '',
    city: 'Uberaba',
    position: 'so-ativo',
    minCm: 17,
    maxPrice: 0,
    servesMen: true,
    hasLocalOnly: false,
    sort: 'cm-desc',
  }
}

export function filterProfiles(profiles: GpProfile[], f: GpFilters): GpProfile[] {
  let list = profiles.filter((p) => p.age >= 21)

  if (f.city && f.city !== 'todas') {
    list = list.filter((p) => p.city.toLowerCase() === f.city.toLowerCase())
  }

  if (f.servesMen) {
    list = list.filter((p) => p.serves.some((s) => s.toLowerCase().includes('homem')))
  }

  if (f.hasLocalOnly) {
    list = list.filter((p) => p.hasLocal)
  }

  if (f.minCm > 0) {
    list = list.filter((p) => p.sizeCm >= f.minCm)
  }

  if (f.maxPrice > 0) {
    list = list.filter((p) => p.priceFrom == null || p.priceFrom <= f.maxPrice)
  }

  if (f.position === 'so-ativo') {
    list = list.filter((p) => p.position === 'ativo' || p.position === 'ativo-liberal')
  } else if (f.position !== 'todos') {
    list = list.filter((p) => p.position === f.position)
  }

  const q = f.query.trim().toLowerCase()
  if (q) {
    list = list.filter((p) => {
      const blob = [
        p.name,
        p.city,
        p.neighborhood ?? '',
        p.body ?? '',
        p.notes ?? '',
        ...p.tags,
        ...p.services,
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }

  list = [...list].sort((a, b) => {
    switch (f.sort) {
      case 'price-asc':
        return (a.priceFrom ?? 9999) - (b.priceFrom ?? 9999)
      case 'age-asc':
        return a.age - b.age
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR')
      case 'cm-desc':
      default:
        return b.sizeCm - a.sizeCm
    }
  })

  return list
}

export function positionLabel(pos: GpProfile['position']): string {
  switch (pos) {
    case 'ativo':
      return 'Ativo'
    case 'ativo-liberal':
      return 'Ativo liberal'
    case 'passivo':
      return 'Passivo'
    case 'versatil':
      return 'Versátil'
  }
}

export function waLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '')
  const msg = encodeURIComponent(text ?? '')
  return `https://wa.me/${digits}${msg ? `?text=${msg}` : ''}`
}
