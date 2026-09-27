import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { emptySession, type Session } from '../shared/types.ts'

export function sessionFile(root: string): string {
  return path.join(root, 'data', 'rode-session.json')
}

export function loadSession(root: string): Session {
  const file = sessionFile(root)
  if (!existsSync(file)) {
    return emptySession(process.env.RODE_MODEL?.trim() || undefined)
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<Session>
    const base = emptySession(process.env.RODE_MODEL?.trim() || undefined)
    return {
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : base.model,
      system: typeof parsed.system === 'string' && parsed.system ? parsed.system : base.system,
      search: Boolean(parsed.search),
      previousResponseId:
        typeof parsed.previousResponseId === 'string' ? parsed.previousResponseId : null,
      turns: Array.isArray(parsed.turns)
        ? parsed.turns.filter(
            (turn) =>
              turn &&
              (turn.role === 'user' || turn.role === 'assistant' || turn.role === 'note') &&
              typeof turn.text === 'string',
          )
        : [],
    }
  } catch {
    return emptySession(process.env.RODE_MODEL?.trim() || undefined)
  }
}

export function saveSession(root: string, session: Session) {
  const file = sessionFile(root)
  mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(session, null, 2))
  renameSync(tmp, file)
}
