export function getLlmConfig() {
  const openAiBase = process.env.OPENAI_BASE_URL?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const openAiModel = process.env.OPENAI_MODEL?.trim();

  if (openAiBase && openAiKey) {
    return {
      provider: "openai" as const,
      baseUrl: openAiBase.replace(/\/$/, ""),
      apiKey: openAiKey,
      model: openAiModel || "glm-4.7-flash-heretic",
    };
  }

  return {
    provider: "ollama" as const,
    baseUrl: (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").replace(
      /\/$/,
      "",
    ),
    apiKey: process.env.OLLAMA_API_KEY || "ollama",
    model:
      process.env.OLLAMA_MODEL ||
      "hf.co/ThalisAI/GLM-4.7-Flash-heretic:Q4_K_M",
  };
}

export function getTorConfig() {
  return {
    host: process.env.TOR_SOCKS_HOST || "127.0.0.1",
    port: Number(process.env.TOR_SOCKS_PORT || "9050"),
  };
}

export const SYSTEM_PROMPT = `You are GLM-4.7-Flash-heretic running in a local operator console.
You have internet access through the Tor network via tools.
When the user asks for live web info, use tools. Prefer fetch_url for specific pages and web_search for discovery.
Be direct, technical, and complete. Reply in the user's language.`;
