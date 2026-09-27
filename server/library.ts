import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LibraryItem, Source } from './types.ts'

const DATA_DIR = join(process.cwd(), 'data')
const LIBRARY_PATH = join(DATA_DIR, 'library.json')
const MAX_ITEMS = 100

let chain: Promise<unknown> = Promise.resolve()

export async function listLibrary(): Promise<LibraryItem[]> {
  return readItems()
}

export function saveLibraryItem(input: {
  kind: 'page' | 'report'
  title: string
  url: string
  content: string
  query: string
  sources: Source[]
}): Promise<LibraryItem> {
  const item: LibraryItem = {
    id: crypto.randomUUID(),
    kind: input.kind,
    title: clip(input.title, 180) || 'Sem título',
    url: input.url,
    content: clip(input.content, 100_000),
    query: clip(input.query, 500),
    createdAt: new Date().toISOString(),
    sources: input.sources.slice(0, 12).map(cleanSource),
  }

  return enqueue(async () => {
    const items = await readItems()
    const next = [item, ...items].slice(0, MAX_ITEMS)
    await writeItems(next)
    return item
  })
}

export function deleteLibraryItem(id: string): Promise<boolean> {
  return enqueue(async () => {
    const items = await readItems()
    const next = items.filter((item) => item.id !== id)
    if (next.length === items.length) return false
    await writeItems(next)
    return true
  })
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function readItems(): Promise<LibraryItem[]> {
  try {
    const raw = await readFile(LIBRARY_PATH, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((value) => {
      if (!isLibraryItem(value)) return []
      const query = typeof value.query === 'string' ? value.query : ''
      return [{ ...value, query }]
    })
  } catch {
    return []
  }
}

async function writeItems(items: LibraryItem[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(LIBRARY_PATH, JSON.stringify(items, null, 2), 'utf8')
}

function isLibraryItem(value: unknown): value is LibraryItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<LibraryItem>
  return (
    typeof item.id === 'string' &&
    (item.kind === 'page' || item.kind === 'report') &&
    typeof item.title === 'string' &&
    typeof item.url === 'string' &&
    typeof item.content === 'string' &&
    typeof item.createdAt === 'string' &&
    Array.isArray(item.sources)
  )
}

function cleanSource(source: Source): Source {
  return {
    title: clip(source.title, 180) || source.url,
    url: source.url,
    snippet: clip(source.snippet, 400),
  }
}

function clip(value: string, max: number): string {
  return value.split('\u0000').join('').trim().slice(0, max)
}
