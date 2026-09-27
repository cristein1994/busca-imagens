import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const MODELFILE_PATH = join(process.cwd(), 'modelfile')

export type ParsedModelfile = {
  raw: string
  system: string
  temperature: number
}

export async function readModelfile(): Promise<ParsedModelfile> {
  const raw = await readFile(MODELFILE_PATH, 'utf8')
  return parseModelfile(raw)
}

export async function writeModelfile(raw: string): Promise<ParsedModelfile> {
  const text = raw.split('\u0000').join('').slice(0, 20_000)
  await writeFile(MODELFILE_PATH, text.endsWith('\n') ? text : `${text}\n`, 'utf8')
  return parseModelfile(text)
}

export function parseModelfile(raw: string): ParsedModelfile {
  const systemMatch = raw.match(/SYSTEM\s+"""([\s\S]*?)"""/)
  const tempMatch = raw.match(/PARAMETER\s+temperature\s+([0-9]*\.?[0-9]+)/i)
  let temperature = tempMatch ? Number(tempMatch[1]) : 0.7
  if (!Number.isFinite(temperature)) temperature = 0.7
  temperature = Math.min(2, Math.max(0, temperature))
  const system = (systemMatch?.[1] ?? raw).trim().slice(0, 8_000)
  return { raw, system, temperature }
}
