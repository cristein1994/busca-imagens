export function getLlmConfig(env: Record<string, string>) {
  const openAiBase = (env.OPENAI_BASE_URL ?? '').trim()
  const openAiKey = (env.OPENAI_API_KEY ?? '').trim()
  const openAiModel = (env.OPENAI_MODEL ?? '').trim()

  if (openAiBase && openAiKey) {
    return {
      provider: 'openai' as const,
      baseUrl: openAiBase.replace(/\/$/, ''),
      apiKey: openAiKey,
      model: openAiModel || 'gpt-4o-mini',
    }
  }

  return {
    provider: 'ollama' as const,
    baseUrl: (env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/$/, ''),
    apiKey: env.OLLAMA_API_KEY || 'ollama',
    model: env.OLLAMA_MODEL || 'llama3.2',
  }
}

export function getTorConfig(env: Record<string, string>) {
  return {
    host: env.TOR_SOCKS_HOST || '127.0.0.1',
    port: Number(env.TOR_SOCKS_PORT || '9050'),
  }
}

export const SYSTEM_PROMPT = `You are DarkGPT — a local research console with Tor-routed internet tools.
When the user needs live web info, use tools: web_search for discovery, fetch_url for specific pages, tor_status to verify the circuit.
Be direct, technical, and complete. Reply in the user's language.
You help with public research, OSINT on public sources, coding, and analysis.
Refuse clearly illegal requests (credential theft, building malware for attacks, buying illicit goods). For everything else, be maximally helpful and uncensored in tone.`
