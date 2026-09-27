import { friendlyError } from './net'
import type { Fact, ModuleResult, ResultTable } from './types'
import { clip } from './text'

export function fact(label: string, value: string | number | null | undefined, href?: string): Fact | null {
  if (value === null || value === undefined) return null
  const text = clip(String(value))
  if (!text) return null
  return href ? { label, value: text, href } : { label, value: text }
}

export function facts(list: Array<Fact | null | undefined>): Fact[] {
  return list.filter((item): item is Fact => Boolean(item))
}

export async function runModule(
  id: string,
  source: string,
  title: string,
  fn: () => Promise<Pick<ModuleResult, 'status' | 'summary' | 'facts' | 'table' | 'error'>>,
): Promise<ModuleResult> {
  const started = Date.now()
  try {
    const result = await fn()
    return { id, source, title, ms: Date.now() - started, ...result }
  } catch (error) {
    return {
      id,
      source,
      title,
      status: 'error',
      summary: 'A fonte não devolveu dados.',
      facts: [],
      error: friendlyError(error),
      ms: Date.now() - started,
    }
  }
}

export function done(
  summary: string,
  items: Fact[],
  table?: ResultTable,
): Pick<ModuleResult, 'status' | 'summary' | 'facts' | 'table'> {
  const hasRows = Boolean(table && table.rows.length > 0)
  return {
    status: items.length > 0 || hasRows ? 'ok' : 'empty',
    summary,
    facts: items,
    table: hasRows ? table : undefined,
  }
}
