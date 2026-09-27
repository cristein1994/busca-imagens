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

type LlmMessage = ChatMessage & {
  reasoning?: string;
  reasoning_content?: string;
};

function stripThinking(text: string): string {
  if (!text) return "";
  // Drop incomplete/complete thinking blocks from GLM-style output
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  out = out.replace(/^[\s\S]*?<\/think>/i, "");
  out = out.replace(/<think>[\s\S]*$/i, "");
  return out.trim();
}

function visibleContent(msg: LlmMessage): string {
  const content = stripThinking(msg.content || "");
  if (content) return content;
  const reasoning = msg.reasoning_content || msg.reasoning || "";
  // Last line of reasoning sometimes holds the intended short answer
  const lines = reasoning
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[lines.length - 1] || "";
}

async function chatOpenAiCompat(messages: ChatMessage[]) {
  const cfg = getLlmConfig();
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
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
      stream: false,
      temperature: 0.7,
      max_tokens: 1024,
      think: false,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM ${res.status}: ${errText.slice(0, 800)}`);
  }
  const data = (await res.json()) as {
    choices: Array<{
      message: LlmMessage & { tool_calls?: ToolCall[] };
      finish_reason?: string;
    }>;
  };
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new Error("empty LLM response");
  return {
    content: visibleContent(msg),
    tool_calls: msg.tool_calls || [],
    raw: msg,
  };
}

/** Ollama native /api/chat — better think:false + tool support for local GGUF */
async function chatOllamaNative(messages: ChatMessage[]) {
  const cfg = getLlmConfig();
  const root = cfg.baseUrl.replace(/\/v1$/, "");
  const res = await fetch(`${root}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      tools: TOOL_DEFINITIONS.map((t) => t.function),
      stream: false,
      think: false,
      options: {
        temperature: 0.7,
        num_ctx: 4096,
        num_predict: 1024,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama ${res.status}: ${errText.slice(0, 800)}`);
  }
  const data = (await res.json()) as {
    message?: LlmMessage & {
      tool_calls?: Array<{
        function: { name: string; arguments: Record<string, unknown> | string };
      }>;
    };
  };
  const msg = data.message;
  if (!msg) throw new Error("empty Ollama response");

  const tool_calls: ToolCall[] = (msg.tool_calls || []).map((tc, i) => {
    const args =
      typeof tc.function.arguments === "string"
        ? tc.function.arguments
        : JSON.stringify(tc.function.arguments ?? {});
    return {
      id: `call_${Date.now()}_${i}`,
      type: "function",
      function: { name: tc.function.name, arguments: args },
    };
  });

  return {
    content: visibleContent(msg),
    tool_calls,
    raw: msg,
  };
}

async function nonStreamOnce(messages: ChatMessage[]) {
  const cfg = getLlmConfig();
  if (cfg.provider === "ollama") {
    try {
      return await chatOllamaNative(messages);
    } catch (e) {
      // fallback to openai-compat
      console.warn("ollama native failed, falling back", e);
    }
  }
  return chatOpenAiCompat(messages);
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
    const msg = await nonStreamOnce(messages);

    if (msg.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content || "",
        tool_calls: msg.tool_calls,
      });

      for (const call of msg.tool_calls) {
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
    if (!finalText) {
      finalText = "(empty model response — try again with a shorter prompt)";
    }
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
