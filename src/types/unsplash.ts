export interface UnsplashUser {
  name: string
  username: string
  links: {
    html: string
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

export interface UnsplashPhoto {
  id: string
  alt_description: string | null
  description: string | null
  width: number
  height: number
  urls: UnsplashUrls
  links: UnsplashLinks
  user: UnsplashUser
}

export interface UnsplashSearchResponse {
  total: number
  total_pages: number
  results: UnsplashPhoto[]
}
