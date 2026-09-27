import { getLlmConfig, SYSTEM_PROMPT } from "./config";
import { TOOL_DEFINITIONS, runTool } from "./tools";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type StreamHandlers = {
  onToken: (text: string) => void;
  onTool: (info: { name: string; args: string; result: string }) => void;
  onStatus: (text: string) => void;
};

async function chatCompletion(
  messages: ChatMessage[],
  stream: boolean,
): Promise<Response> {
  const cfg = getLlmConfig();
  return fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      stream,
      temperature: 0.7,
    }),
  });
}

async function nonStreamOnce(messages: ChatMessage[]) {
  const res = await chatCompletion(messages, false);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM ${res.status}: ${errText.slice(0, 800)}`);
  }
  return (await res.json()) as {
    choices: Array<{
      message: ChatMessage & { tool_calls?: ToolCall[] };
      finish_reason?: string;
    }>;
  };
}

export async function runAgent(
  userMessages: ChatMessage[],
  handlers: StreamHandlers,
  maxRounds = 6,
): Promise<string> {
  const cfg = getLlmConfig();
  handlers.onStatus(`model=${cfg.model} provider=${cfg.provider}`);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMessages.filter((m) => m.role !== "system"),
  ];

  let finalText = "";

  for (let round = 0; round < maxRounds; round++) {
    handlers.onStatus(`round ${round + 1}/${maxRounds}`);
    const data = await nonStreamOnce(messages);
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("empty LLM response");

    const toolCalls = msg.tool_calls || [];
    if (toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content || "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        handlers.onStatus(`tool ${call.function.name}`);
        const result = await runTool(
          call.function.name,
          call.function.arguments || "{}",
        );
        handlers.onTool({
          name: call.function.name,
          args: call.function.arguments || "{}",
          result,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: result,
        });
      }
      continue;
    }

    finalText = msg.content || "";
    // stream tokens to UI in chunks
    const chunkSize = 24;
    for (let i = 0; i < finalText.length; i += chunkSize) {
      handlers.onToken(finalText.slice(i, i + chunkSize));
    }
    return finalText;
  }

  finalText =
    "Tool loop limit reached. Try a narrower question or check Tor/Ollama.";
  handlers.onToken(finalText);
  return finalText;
}

export async function probeLlm(): Promise<{
  ok: boolean;
  model: string;
  baseUrl: string;
  error?: string;
  models?: string[];
}> {
  const cfg = getLlmConfig();
  try {
    const root = cfg.baseUrl.replace(/\/v1$/, "");
    const res = await fetch(`${root}/api/tags`, { method: "GET" });
    if (res.ok) {
      const data = (await res.json()) as {
        models?: Array<{ name: string }>;
      };
      const models = (data.models || []).map((m) => m.name);
      const present = models.some(
        (n) => n === cfg.model || n.includes("heretic") || n.includes("glm"),
      );
      return {
        ok: present || models.length > 0,
        model: cfg.model,
        baseUrl: cfg.baseUrl,
        models,
        error: present
          ? undefined
          : models.length
            ? `model not pulled yet; available: ${models.slice(0, 8).join(", ")}`
            : "no models pulled — run npm run model:pull",
      };
    }

    // OpenAI-compatible models list
    const mres = await fetch(`${cfg.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });
    if (!mres.ok) {
      return {
        ok: false,
        model: cfg.model,
        baseUrl: cfg.baseUrl,
        error: `LLM probe failed: ${mres.status}`,
      };
    }
    const mdata = (await mres.json()) as {
      data?: Array<{ id: string }>;
    };
    return {
      ok: true,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      models: (mdata.data || []).map((d) => d.id),
    };
  } catch (e) {
    return {
      ok: false,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
