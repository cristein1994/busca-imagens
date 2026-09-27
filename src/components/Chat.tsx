"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { StatusBar } from "./StatusBar";

type Role = "user" | "assistant" | "system";

type Msg = {
  id: string;
  role: Role;
  content: string;
  tools?: Array<{ name: string; args: string; result: string }>;
};

type StatusPayload = {
  tor?: {
    ok: boolean;
    isTor: boolean;
    ip?: string;
    error?: string;
    host?: string;
    port?: number;
  };
  llm?: {
    ok: boolean;
    model: string;
    baseUrl: string;
    error?: string;
    models?: string[];
  };
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "HERETIC online. Internet tools route through Tor. Ask anything — I can search and fetch pages via the onion path.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/status");
      const data = (await res.json()) as StatusPayload;
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
    const t = setInterval(() => void refreshStatus(), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusText]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: Msg = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    setInput("");
    setBusy(true);
    setStatusText("connecting…");
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", tools: [] },
    ]);

    const history = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          const payload = JSON.parse(data) as Record<string, unknown>;

          if (event === "token") {
            const chunk = String(payload.text || "");
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m,
              ),
            );
          } else if (event === "tool") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      tools: [
                        ...(m.tools || []),
                        {
                          name: String(payload.name || ""),
                          args: String(payload.args || ""),
                          result: String(payload.result || ""),
                        },
                      ],
                    }
                  : m,
              ),
            );
          } else if (event === "status") {
            setStatusText(String(payload.text || ""));
          } else if (event === "error") {
            throw new Error(String(payload.message || "chat error"));
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  m.content ||
                  `Erro: ${message}\n\nDica: suba Ollama + puxe o modelo (\`npm run model:pull\`) e garanta Tor (\`npm run tor:check\`).`,
              }
            : m,
        ),
      );
    } finally {
      setBusy(false);
      setStatusText("");
      void refreshStatus();
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="animate-rise mb-6">
        <div className="scanline mb-4 h-px w-full" />
        <p
          className="mb-1 text-xs uppercase tracking-[0.35em]"
          style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
        >
          operator console
        </p>
        <h1
          className="text-4xl font-extrabold tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          HERETIC
        </h1>
        <p className="mt-2 max-w-2xl text-base" style={{ color: "var(--muted)" }}>
          GLM-4.7-Flash-heretic · internet via Tor SOCKS5
        </p>
        <div className="mt-5">
          <StatusBar
            status={status}
            loading={statusLoading}
            onRefresh={() => void refreshStatus()}
          />
        </div>
      </header>

      <main
        className="animate-rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl"
        style={{
          background: "rgba(8,14,12,0.55)",
          border: "1px solid var(--line)",
          animationDelay: "0.08s",
        }}
      >
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.map((m) => (
            <article
              key={m.id}
              className="animate-rise"
              style={{
                marginLeft: m.role === "user" ? "auto" : 0,
                marginRight: m.role === "assistant" ? "auto" : 0,
                maxWidth: "85%",
              }}
            >
              <div
                className="mb-1 text-[11px] uppercase tracking-widest"
                style={{
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {m.role === "user" ? "you" : "heretic"}
              </div>
              <div
                className="whitespace-pre-wrap rounded-lg px-4 py-3 text-[15px] leading-relaxed"
                style={{
                  background:
                    m.role === "user"
                      ? "rgba(61,207,142,0.12)"
                      : "rgba(255,255,255,0.03)",
                  border: "1px solid var(--line)",
                }}
              >
                {m.content || (busy ? "…" : "")}
              </div>
              {m.tools && m.tools.length > 0 && (
                <div className="mt-2 space-y-2">
                  {m.tools.map((t, i) => (
                    <details
                      key={`${m.id}-tool-${i}`}
                      className="rounded-md px-3 py-2 text-xs"
                      style={{
                        border: "1px dashed var(--line)",
                        color: "var(--muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <summary className="cursor-pointer text-[var(--accent)]">
                        tool · {t.name}
                      </summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                        {t.args}
                        {"\n---\n"}
                        {t.result.slice(0, 2500)}
                      </pre>
                    </details>
                  ))}
                </div>
              )}
            </article>
          ))}
          {statusText && (
            <p
              className="text-xs"
              style={{ color: "var(--warn)", fontFamily: "var(--font-mono)" }}
            >
              {statusText}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="flex gap-2 border-t px-4 py-4 sm:px-6"
          style={{ borderColor: "var(--line)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo — busca e fetch saem pela rede Tor"
            disabled={busy}
            className="min-w-0 flex-1 rounded-lg px-4 py-3 outline-none"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
            }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg px-5 py-3 text-sm font-semibold uppercase tracking-wide disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, var(--accent-dim), var(--accent))",
              color: "#04140c",
              fontFamily: "var(--font-display)",
            }}
          >
            Send
          </button>
        </form>
      </main>

      <footer
        className="mt-4 text-xs"
        style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
      >
        model: hf.co/ThalisAI/GLM-4.7-Flash-heretic · socks5h://
        {status?.tor?.host || "127.0.0.1"}:{status?.tor?.port || 9050}
      </footer>
    </div>
  );
}
