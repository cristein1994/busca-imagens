/** Minimal ZIP (store-only, no compression) for browser downloads. */

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]!
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  b[0] = n & 0xff
  b[1] = (n >> 8) & 0xff
  return b
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  b[0] = n & 0xff
  b[1] = (n >> 8) & 0xff
  b[2] = (n >> 16) & 0xff
  b[3] = (n >>> 24) & 0xff
  return b
}

export interface ZipEntry {
  name: string
  data: Uint8Array
}

export function buildZip(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encodeUtf8(entry.name)
    const data = entry.data
    const checksum = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length)
    local.set(u32(0x04034b50), 0)
    local.set(u16(20), 4) // version needed
    local.set(u16(0), 6) // flags
    local.set(u16(0), 8) // method store
    local.set(u16(0), 10) // time
    local.set(u16(0), 12) // date
    local.set(u32(checksum), 14)
    local.set(u32(data.length), 18)
    local.set(u32(data.length), 22)
    local.set(u16(nameBytes.length), 26)
    local.set(u16(0), 28) // extra
    local.set(nameBytes, 30)

    parts.push(local, data)

    const cen = new Uint8Array(46 + nameBytes.length)
    cen.set(u32(0x02014b50), 0)
    cen.set(u16(20), 4)
    cen.set(u16(20), 6)
    cen.set(u16(0), 8)
    cen.set(u16(0), 10)
    cen.set(u16(0), 12)
    cen.set(u16(0), 14)
    cen.set(u32(checksum), 16)
    cen.set(u32(data.length), 20)
    cen.set(u32(data.length), 24)
    cen.set(u16(nameBytes.length), 28)
    cen.set(u16(0), 30)
    cen.set(u16(0), 32)
    cen.set(u16(0), 34)
    cen.set(u16(0), 36)
    cen.set(u32(0), 38)
    cen.set(u32(offset), 42)
    cen.set(nameBytes, 46)
    central.push(cen)

    offset += local.length + data.length
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  end.set(u32(0x06054b50), 0)
  end.set(u16(0), 4)
  end.set(u16(0), 6)
  end.set(u16(entries.length), 8)
  end.set(u16(entries.length), 10)
  end.set(u32(centralSize), 12)
  end.set(u32(offset), 16)
  end.set(u16(0), 20)

  return new Blob([...parts, ...central, end] as BlobPart[], { type: 'application/zip' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
