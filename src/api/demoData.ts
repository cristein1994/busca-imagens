import type { UnsplashPhoto, UnsplashRelatedResponse } from '../types/unsplash'

const DEMO_PHOTOS: UnsplashPhoto[] = [
  {
    id: 'demo-1',
    alt_description: 'Montanhas ao amanhecer com névoa no vale',
    description: 'Amanhecer nas montanhas — foto de demonstração',
    width: 4000,
    height: 2667,
    color: '#6b7c93',
    created_at: '2024-06-12T10:22:00Z',
    likes: 1284,
    views: 98231,
    downloads: 4521,
    urls: {
      raw: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000',
      regular:
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080',
      small:
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
      thumb:
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200',
    },
    links: {
      html: 'https://unsplash.com/photos/demo-1',
      download: 'https://unsplash.com/photos/demo-1/download',
    },
    user: {
      name: 'Ana Demo',
      username: 'anademo',
      bio: 'Fotógrafa de paisagens (demo)',
      location: 'Serra da Mantiqueira',
      total_photos: 42,
      links: { html: 'https://unsplash.com/@anademo' },
    },
    tags: [
      { title: 'montanha' },
      { title: 'amanhecer' },
      { title: 'natureza' },
      { title: 'névoa' },
    ],
    location: {
      name: 'Serra da Mantiqueira, Brasil',
      city: null,
      country: 'Brasil',
    },
    exif: {
      make: 'Sony',
      model: 'ILCE-7M3',
      name: 'Sony ILCE-7M3',
      exposure_time: '1/200',
      aperture: '8.0',
      focal_length: '35',
      iso: 100,
    },
  },
  {
    id: 'demo-2',
    alt_description: 'Lago espelhado sob céu azul',
    description: 'Reflexo no lago — demonstração',
    width: 3600,
    height: 2400,
    color: '#3a6ea5',
    created_at: '2023-11-02T14:10:00Z',
    likes: 860,
    views: 44102,
    downloads: 1902,
    urls: {
      raw: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000',
      full: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=2000',
      regular:
        'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1080',
      small:
        'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400',
      thumb:
        'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=200',
    },
    links: {
      html: 'https://unsplash.com/photos/demo-2',
      download: 'https://unsplash.com/photos/demo-2/download',
    },
    user: {
      name: 'Bruno Demo',
      username: 'brunodemo',
      total_photos: 18,
      links: { html: 'https://unsplash.com/@brunodemo' },
    },
    tags: [{ title: 'lago' }, { title: 'água' }, { title: 'natureza' }],
    location: {
      name: 'Patagonia',
      city: null,
      country: 'Argentina',
    },
    exif: {
      make: 'Canon',
      model: 'EOS R6',
      name: 'Canon EOS R6',
      exposure_time: '1/320',
      aperture: '5.6',
      focal_length: '24',
      iso: 200,
    },
  },
  {
    id: 'demo-3',
    alt_description: 'Floresta com luz filtrada',
    description: null,
    width: 3200,
    height: 4800,
    color: '#2f4f3a',
    created_at: '2025-01-18T08:00:00Z',
    likes: 412,
    views: 22011,
    downloads: 788,
    urls: {
      raw: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
      full: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=2000',
      regular:
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080',
      small:
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
      thumb:
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200',
    },
    links: {
      html: 'https://unsplash.com/photos/demo-3',
      download: 'https://unsplash.com/photos/demo-3/download',
    },
    user: {
      name: 'Carla Demo',
      username: 'carlademo',
      total_photos: 27,
      links: { html: 'https://unsplash.com/@carlademo' },
    },
    tags: [{ title: 'floresta' }, { title: 'verde' }, { title: 'natureza' }],
    location: {
      name: 'Parque Nacional',
      city: null,
      country: 'Brasil',
    },
    exif: null,
  },
]

export function isDemoMode(accessKey: string | undefined): boolean {
  return accessKey === 'demo'
}

export function demoSearchPhotos(query: string): UnsplashPhoto[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return DEMO_PHOTOS.filter((photo) => {
    const haystack = [
      photo.alt_description,
      photo.description,
      photo.user.name,
      ...(photo.tags ?? []).map((tag) => tag.title),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q) || q === 'demo' || q === 'natureza'
  })
}

export function demoPhotoDetails(id: string): UnsplashPhoto | undefined {
  return DEMO_PHOTOS.find((photo) => photo.id === id)
}

export function demoRelatedPhotos(id: string): UnsplashRelatedResponse {
  return {
    results: DEMO_PHOTOS.filter((photo) => photo.id !== id),
  }
}
