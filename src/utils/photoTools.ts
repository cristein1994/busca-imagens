import type { UnsplashPhoto } from '../types/unsplash'

export function buildMarkdownCredit(photo: UnsplashPhoto): string {
  const alt = photo.alt_description || photo.description || 'Foto'
  const photoUrl = `${photo.links.html}?utm_source=busca_imagens&utm_medium=referral`
  const userUrl = `${photo.user.links.html}?utm_source=busca_imagens&utm_medium=referral`
  return `![${alt}](${photo.urls.regular})\nFoto de [${photo.user.name}](${userUrl}) no [Unsplash](${photoUrl})`
}

export function buildRelatedDataExport(
  photo: UnsplashPhoto,
  relatedIds: string[] = [],
): string {
  const payload = {
    id: photo.id,
    description: photo.description ?? photo.alt_description,
    url: photo.urls.regular,
    html: photo.links.html,
    width: photo.width,
    height: photo.height,
    color: photo.color ?? null,
    created_at: photo.created_at ?? null,
    likes: photo.likes ?? null,
    views: photo.views ?? null,
    downloads: photo.downloads ?? null,
    location: photo.location ?? null,
    exif: photo.exif ?? null,
    tags: (photo.tags ?? []).map((tag) => tag.title),
    photographer: {
      name: photo.user.name,
      username: photo.user.username,
      profile: photo.user.links.html,
      total_photos: photo.user.total_photos ?? null,
    },
    related_photo_ids: relatedIds,
    exported_at: new Date().toISOString(),
  }

  return JSON.stringify(payload, null, 2)
}

export function triggerBrowserDownload(url: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}
