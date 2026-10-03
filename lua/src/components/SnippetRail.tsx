"use client";

import type { Snippet } from "@/lib/snippets";

const PHASE_LABEL: Record<Snippet["phase"], string> = {
  nova: "nova",
  crescente: "crescente",
  cheia: "cheia",
  minguante: "minguante",
};

type Props = {
  snippets: Snippet[];
  activeId: string;
  onPick: (snippet: Snippet) => void;
};

export default function SnippetRail({ snippets, activeId, onPick }: Props) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[var(--line)] bg-[rgba(14,18,24,0.55)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-[var(--moon)]">
          Constelações
        </p>
        <p className="mt-0.5 text-xs text-[var(--brass)]">exemplos para abrir o caderno</p>
      </div>
      <nav className="luneta-scroll flex-1 space-y-2 overflow-y-auto p-3" aria-label="Exemplos Lua">
        {snippets.map((snippet) => {
          const active = snippet.id === activeId;
          return (
            <button
              key={snippet.id}
              type="button"
              onClick={() => onPick(snippet)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? "border-[var(--brass)] bg-[rgba(184,149,90,0.14)]"
                  : "border-transparent bg-[rgba(22,27,36,0.7)] hover:border-[var(--line)]"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--foam)]">{snippet.title}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--brass)]">
                  {PHASE_LABEL[snippet.phase]}
                </span>
              </span>
              <span className="mt-1 block text-xs text-[rgba(239,230,212,0.62)]">
                {snippet.blurb}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
