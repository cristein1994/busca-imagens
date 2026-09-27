export function parseModelfile(raw: string): { system: string; temperature: number } {
  const systemMatch = raw.match(/SYSTEM\s+"""([\s\S]*?)"""/)
  const tempMatch = raw.match(/PARAMETER\s+temperature\s+([0-9]*\.?[0-9]+)/i)
  let temperature = tempMatch ? Number(tempMatch[1]) : 0.7
  if (!Number.isFinite(temperature)) temperature = 0.7
  temperature = Math.min(2, Math.max(0, temperature))
  const system = (systemMatch?.[1] ?? raw).trim().slice(0, 8_000)
  return { system, temperature }
}
