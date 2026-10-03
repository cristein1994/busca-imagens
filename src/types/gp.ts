export type Position = 'ativo' | 'passivo' | 'versatil' | 'ativo-liberal'

export interface GpProfile {
  id: string
  name: string
  age: number
  city: string
  neighborhood?: string
  position: Position
  sizeCm: number
  heightCm?: number
  weightKg?: number
  body?: string
  tags: string[]
  services: string[]
  serves: string[]
  priceFrom?: number
  hasLocal: boolean
  phone?: string
  whatsapp?: string
  sourceUrl?: string
  sourceName?: string
  notes?: string
  verified?: boolean
}

export interface GpFilters {
  query: string
  city: string
  position: 'todos' | Position | 'so-ativo'
  minCm: number
  maxPrice: number
  servesMen: boolean
  hasLocalOnly: boolean
  sort: 'cm-desc' | 'price-asc' | 'age-asc' | 'name'
}
