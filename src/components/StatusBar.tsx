"use client";

type Status = {
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

export function StatusBar({
  status,
  loading,
  onRefresh,
}: {
  status: Status | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const torOk = Boolean(status?.tor?.isTor);
  const llmOk = Boolean(status?.llm?.ok);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5"
        style={{
          background: "rgba(0,0,0,0.28)",
          border: "1px solid var(--line)",
        }}
      >
        <span
          className="pulse-dot inline-block h-2 w-2 rounded-full"
          style={{ background: torOk ? "var(--accent)" : "var(--danger)" }}
        />
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
          TOR
        </span>
        <span>
          {loading && !status
            ? "…"
            : torOk
              ? `exit ${status?.tor?.ip}`
              : status?.tor?.error || "offline"}
        </span>
      </span>

      <span
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5"
        style={{
          background: "rgba(0,0,0,0.28)",
          border: "1px solid var(--line)",
        }}
      >
        <span
          className="pulse-dot inline-block h-2 w-2 rounded-full"
          style={{
            background: llmOk ? "var(--accent)" : "var(--warn)",
            animationDelay: "0.4s",
          }}
        />
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
          GLM
        </span>
        <span className="max-w-[42ch] truncate">
          {status?.llm?.model || "…"}
          {!llmOk && status?.llm?.error ? ` · ${status.llm.error}` : ""}
        </span>
      </span>

      <button
        type="button"
        onClick={onRefresh}
        className="ml-auto rounded-md px-3 py-1.5 text-xs uppercase tracking-wide transition hover:opacity-90"
        style={{
          border: "1px solid var(--line)",
          color: "var(--accent)",
          background: "rgba(61,207,142,0.08)",
          fontFamily: "var(--font-mono)",
        }}
      >
        refresh
      </button>
    </div>
  );
}
