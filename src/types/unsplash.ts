export interface UnsplashUser {
  name: string
  username: string
  links: {
    html: string
  }
  bio?: string | null
  location?: string | null
  total_photos?: number
  profile_image?: {
    small: string
    medium: string
    large: string
  }
}

export interface UnsplashUrls {
  raw: string
  full: string
  regular: string
  small: string
  thumb: string
}

export interface UnsplashLinks {
  html: string
  download: string
}

export interface UnsplashTag {
  type?: string
  title: string
}

export interface UnsplashLocation {
  name: string | null
  city: string | null
  country: string | null
}

export interface UnsplashExif {
  make: string | null
  model: string | null
  name: string | null
  exposure_time: string | null
  aperture: string | null
  focal_length: string | null
  iso: number | null
}

export interface UnsplashPhoto {
  id: string
  alt_description: string | null
  description: string | null
  width: number
  height: number
  color?: string | null
  created_at?: string
  likes?: number
  views?: number
  downloads?: number
  urls: UnsplashUrls
  links: UnsplashLinks
  user: UnsplashUser
  tags?: UnsplashTag[]
  location?: UnsplashLocation | null
  exif?: UnsplashExif | null
}

export interface UnsplashSearchResponse {
  total: number
  total_pages: number
  results: UnsplashPhoto[]
}

export interface UnsplashRelatedResponse {
  results: UnsplashPhoto[]
}

export interface RelatedPhotoData {
  details: UnsplashPhoto
  related: UnsplashPhoto[]
}
