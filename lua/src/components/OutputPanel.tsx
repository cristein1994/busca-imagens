"use client";

import type { RunResponse } from "@/lib/types";

type Props = {
  result: RunResponse | null;
  running: boolean;
};

function formatReturn(value: unknown): string {
  if (value === null) return "nil";
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value, null, 2);
}

export default function OutputPanel({ result, running }: Props) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[var(--night-soft)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-sm text-[var(--moon)]">
            Luneta
          </p>
          <p className="text-xs text-[var(--brass)]">saída, retornos e erros</p>
        </div>
        {result ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.12em] ${
              result.status === "ok"
                ? "bg-[rgba(61,122,90,0.2)] text-[#8fd4b0]"
                : result.status === "timeout"
                  ? "bg-[rgba(184,149,90,0.18)] text-[var(--brass-hot)]"
                  : "bg-[rgba(181,74,60,0.18)] text-[#f0a090]"
            }`}
          >
            {result.status === "ok"
              ? "ok"
              : result.status === "timeout"
                ? "tempo"
                : result.status === "invalid"
                  ? "inválido"
                  : "erro"}
          </span>
        ) : (
          <span className="text-[11px] uppercase tracking-[0.12em] text-[rgba(239,230,212,0.4)]">
            à espera
          </span>
        )}
      </header>

      <div className="luneta-scroll flex-1 overflow-y-auto px-4 py-4 font-[family-name:var(--font-mono)] text-[13px] leading-6">
        {running && (
          <p className="text-[var(--brass-hot)]">executando no interpretador…</p>
        )}

        {!running && !result && (
          <p className="max-w-[28ch] text-[rgba(239,230,212,0.55)]">
            Aperte <kbd className="rounded bg-[rgba(184,149,90,0.18)] px-1.5">Executar</kbd>{" "}
            ou Ctrl/⌘ Enter. O print aparece aqui; um <code>return</code> no topo do
            script também.
          </p>
        )}

        {result?.error && (
          <div className="mb-4 rounded-lg border border-[rgba(181,74,60,0.4)] bg-[rgba(181,74,60,0.1)] px-3 py-2 text-[#f0a090]">
            {result.line != null && (
              <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-[#f0a090]/80">
                linha {result.line}
              </p>
            )}
            <p className="whitespace-pre-wrap">{result.error}</p>
          </div>
        )}

        {result && result.stdout.length > 0 && (
          <div className="space-y-0.5">
            {result.stdout.map((line, i) => (
              <pre key={`${i}-${line}`} className="whitespace-pre-wrap text-[var(--foam)]">
                {line || " "}
              </pre>
            ))}
          </div>
        )}

        {result && result.stdout.length === 0 && result.status === "ok" && (
          <p className="text-[rgba(239,230,212,0.4)]">nenhum print</p>
        )}

        {result && result.returns.length > 0 && (
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-[var(--brass)]">
              retorno
            </p>
            {result.returns.map((value, i) => (
              <pre key={i} className="whitespace-pre-wrap text-[var(--moon)]">
                {formatReturn(value)}
              </pre>
            ))}
          </div>
        )}
      </div>

      {result && (
        <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line)] px-4 py-2 text-[11px] text-[rgba(239,230,212,0.45)]">
          <span>{result.elapsedMs.toFixed(2)} ms</span>
          <span>{result.instructionCount.toLocaleString("pt-BR")} inst.</span>
          <span>
            Lua {result.luaVersion} · {result.runtime}
          </span>
        </footer>
      )}
    </section>
  );
}
