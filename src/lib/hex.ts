export interface HexRow {
  offset: string
  hex: string[]
  ascii: string
}

export function toHexRows(data: Uint8Array, bytesPerRow = 16): HexRow[] {
  const rows: HexRow[] = []
  for (let i = 0; i < data.length; i += bytesPerRow) {
    const slice = data.slice(i, i + bytesPerRow)
    const hex = Array.from(slice).map((b) => b.toString(16).padStart(2, '0'))
    while (hex.length < bytesPerRow) hex.push('  ')
    const ascii = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('')
    rows.push({
      offset: i.toString(16).padStart(8, '0'),
      hex,
      ascii,
    })
  }
  return rows
}

export function formatRelativeTime(seconds: number): string {
  return seconds.toFixed(6)
}
