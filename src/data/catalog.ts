export type BagColor = {
  id: 'black' | 'tan'
  label: string
  sku: string
  leather: [string, string]
  stitch: string
}

export type PhoneModel = {
  id: string
  name: string
  year: number
  group: string
  heightMm: number
  widthMm: number
  depthMm: number
  /** Used for depth fit when the camera stands proud of the body. */
  cameraDepthMm?: number
  cameraDepthNote?: string
  weightG: number
  displayIn: number
}

export const bag = {
  brand: 'ALDO',
  name: 'Pponak',
  silhouette: 'Satchel',
  heightMm: 500,
  lengthMm: 440,
  depthMm: 220,
  weightG: 800,
  handleMm: 584.2,
  closure: 'Ímã',
  outer: 'Poliuretano (couro sintético)',
  lining: 'Poliéster',
  colors: [
    {
      id: 'tan',
      label: 'Caramelo',
      sku: 'A0151H1XF-O11',
      leather: ['#e4c39a', '#a67c4e'],
      stitch: '#6e4e2e',
    },
    {
      id: 'black',
      label: 'Preto',
      sku: 'A0151H1XF-Q11',
      leather: ['#3a342f', '#14110f'],
      stitch: '#8a8178',
    },
  ] satisfies BagColor[],
}

/** Body sizes published by Apple. Camera bump is separate and only set when a figure is published. */
export const phones: PhoneModel[] = [
  {
    id: 'iphone-18-pro',
    name: 'iPhone 18 Pro',
    year: 2026,
    group: '2026',
    heightMm: 150,
    widthMm: 71.9,
    depthMm: 8.75,
    weightG: 211,
    displayIn: 6.3,
  },
  {
    id: 'iphone-18-pro-max',
    name: 'iPhone 18 Pro Max',
    year: 2026,
    group: '2026',
    heightMm: 163.4,
    widthMm: 78,
    depthMm: 8.75,
    weightG: 249,
    displayIn: 6.9,
  },
  {
    id: 'iphone-17',
    name: 'iPhone 17',
    year: 2025,
    group: '2025',
    heightMm: 149.6,
    widthMm: 71.5,
    depthMm: 7.95,
    weightG: 177,
    displayIn: 6.3,
  },
  {
    id: 'iphone-air',
    name: 'iPhone Air',
    year: 2025,
    group: '2025',
    heightMm: 156.2,
    widthMm: 74.7,
    depthMm: 5.64,
    cameraDepthMm: 11.7,
    cameraDepthNote: 'cerca de 11,7 mm com a câmera',
    weightG: 165,
    displayIn: 6.5,
  },
  {
    id: 'iphone-17-pro',
    name: 'iPhone 17 Pro',
    year: 2025,
    group: '2025',
    heightMm: 150,
    widthMm: 71.9,
    depthMm: 8.75,
    weightG: 206,
    displayIn: 6.3,
  },
  {
    id: 'iphone-17-pro-max',
    name: 'iPhone 17 Pro Max',
    year: 2025,
    group: '2025',
    heightMm: 163.4,
    widthMm: 78,
    depthMm: 8.75,
    weightG: 233,
    displayIn: 6.9,
  },
  {
    id: 'iphone-16',
    name: 'iPhone 16',
    year: 2024,
    group: '2024',
    heightMm: 147.6,
    widthMm: 71.6,
    depthMm: 7.8,
    weightG: 170,
    displayIn: 6.1,
  },
  {
    id: 'iphone-16-plus',
    name: 'iPhone 16 Plus',
    year: 2024,
    group: '2024',
    heightMm: 160.9,
    widthMm: 77.8,
    depthMm: 7.8,
    weightG: 199,
    displayIn: 6.7,
  },
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    year: 2024,
    group: '2024',
    heightMm: 149.6,
    widthMm: 71.5,
    depthMm: 8.25,
    weightG: 199,
    displayIn: 6.3,
  },
  {
    id: 'iphone-16-pro-max',
    name: 'iPhone 16 Pro Max',
    year: 2024,
    group: '2024',
    heightMm: 163,
    widthMm: 77.6,
    depthMm: 8.25,
    weightG: 227,
    displayIn: 6.9,
  },
]

export const sources = [
  {
    label: 'ALDO Satchel Pponak, medidas no Zalando (artigo A0151H1XF)',
    href: 'https://en.zalando.de/aldo-satchel-pponak-tote-bag-tan-a0151h1xf-o11.html',
  },
  {
    label: 'iPhone 18 Pro, ficha técnica da Apple',
    href: 'https://www.apple.com/iphone-18-pro/specs/',
  },
  {
    label: 'iPhone 17, ficha técnica da Apple',
    href: 'https://support.apple.com/en-us/125089',
  },
  {
    label: 'iPhone 17 Pro Max, ficha técnica da Apple',
    href: 'https://support.apple.com/en-us/125091',
  },
] as const

export const phoneGroups = [...new Set(phones.map((phone) => phone.group))]
