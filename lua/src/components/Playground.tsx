"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import MoonMark from "@/components/MoonMark";
import OutputPanel from "@/components/OutputPanel";
import SnippetRail from "@/components/SnippetRail";
import {
  DEFAULT_SNIPPET_ID,
  SNIPPETS,
  snippetById,
  type Snippet,
} from "@/lib/snippets";
import type { RunResponse } from "@/lib/types";

const LuaEditor = dynamic(() => import("@/components/LuaEditor"), {
  ssr: false,
  loading: () => (
    <div className="paper-grain flex h-full items-center justify-center text-sm text-[var(--ink-soft)]">
      abrindo o caderno…
    </div>
  ),
});

const STORAGE_KEY = "wii-lua:source";
const STORAGE_SNIPPET = "wii-lua:snippet";

const firstSnippet = snippetById(DEFAULT_SNIPPET_ID) ?? SNIPPETS[0];

type Draft = { source: string; activeId: string };

const fallbackDraft: Draft = { source: firstSnippet.source, activeId: firstSnippet.id };
let draftSnapshot: Draft = fallbackDraft;
const draftListeners = new Set<() => void>();

function loadDraft(): Draft {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const snippetId = localStorage.getItem(STORAGE_SNIPPET);
    if (saved && saved.trim().length > 0) {
      return {
        source: saved,
        activeId: snippetId && snippetById(snippetId) ? snippetId : "",
      };
    }
  } catch {
    /* ignore quota / private mode */
  }
  return fallbackDraft;
}

function sameDraft(a: Draft, b: Draft) {
  return a.source === b.source && a.activeId === b.activeId;
}

function readDraft(): Draft {
  const next = loadDraft();
  if (sameDraft(draftSnapshot, next)) return draftSnapshot;
  draftSnapshot = next;
  return draftSnapshot;
}

function subscribeDraft(onChange: () => void) {
  draftListeners.add(onChange);
  return () => {
    draftListeners.delete(onChange);
  };
}

function writeDraft(next: Draft) {
  if (sameDraft(draftSnapshot, next)) return;
  draftSnapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, next.source);
    localStorage.setItem(STORAGE_SNIPPET, next.activeId);
  } catch {
    /* ignore */
  }
  draftListeners.forEach((fn) => fn());
}

export default function Playground() {
  const draft = useSyncExternalStore(subscribeDraft, readDraft, () => fallbackDraft);
  const source = draft.source;
  const activeId = draft.activeId;
  const [result, setResult] = useState<RunResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const setSource = useCallback((next: string) => {
    writeDraft({ source: next, activeId: "" });
  }, []);

  const setActiveSnippet = useCallback((snippet: Snippet) => {
    writeDraft({ source: snippet.source, activeId: snippet.id });
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const json = (await res.json()) as RunResponse;
      setResult(json);
    } catch {
      setResult({
        status: "error",
        stdout: [],
        returns: [],
        error: "Não foi possível falar com o interpretador. Confira se o servidor está no ar.",
        line: null,
        elapsedMs: 0,
        instructionCount: 0,
        runtime: "fengari",
        luaVersion: "5.3",
      });
    } finally {
      setRunning(false);
    }
  }, [source]);

  function pickSnippet(snippet: Snippet) {
    setActiveSnippet(snippet);
    setResult(null);
  }

  function clearOutput() {
    setResult(null);
  }

  function resetCaderno() {
    const snippet = snippetById(activeId) ?? firstSnippet;
    writeDraft({ source: snippet.source, activeId: snippet.id });
    setResult(null);
  }

  async function copySource() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="sky stars min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-[1400px] flex-col px-3 py-3 sm:px-5 sm:py-5">
        <header className="animate-rise mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(14,18,24,0.72)] px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <MoonMark className="animate-moon h-12 w-12 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brass)]">
                projeto wii
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none text-[var(--moon)] sm:text-[1.75rem]">
                Wii Lua
                <span className="mx-2 text-[var(--brass)]">·</span>
                <span className="italic">Ateliê Lunar</span>
              </h1>
              <p className="mt-1 text-sm text-[rgba(239,230,212,0.68)]">
                Caderno de Lua 5.3 — escreva, execute, leia a luneta.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right text-xs text-[rgba(239,230,212,0.5)]">
            <span>interpretador fengari · sandbox sem io/os</span>
            <span>Michel Silva</span>
          </div>
        </header>

        <div className="animate-rise-delay grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-[rgba(14,18,24,0.45)] lg:min-h-[calc(100dvh-11rem)] lg:grid-cols-[240px_minmax(0,1fr)_minmax(280px,360px)]">
          <div className="min-h-[220px] lg:min-h-0">
            <SnippetRail snippets={SNIPPETS} activeId={activeId} onPick={pickSnippet} />
          </div>

          <section className="flex min-h-[420px] flex-col border-y border-[var(--line)] lg:min-h-0 lg:border-y-0 lg:border-r">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[rgba(243,234,216,0.08)] px-3 py-2">
              <p className="font-[family-name:var(--font-display)] text-sm text-[var(--moon)]">
                Caderno
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void run()}
                  disabled={running}
                  className="rounded-full bg-[var(--sapphire)] px-4 py-1.5 text-sm font-medium text-[var(--moon)] transition hover:bg-[var(--sapphire-lit)] disabled:opacity-60"
                >
                  {running ? "Executando…" : "Executar"}
                </button>
                <button
                  type="button"
                  onClick={clearOutput}
                  className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--foam)] hover:border-[var(--brass)]"
                >
                  Limpar luneta
                </button>
                <button
                  type="button"
                  onClick={resetCaderno}
                  className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--foam)] hover:border-[var(--brass)]"
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => void copySource()}
                  className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--foam)] hover:border-[var(--brass)]"
                >
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
            <div className="paper-grain relative min-h-0 flex-1">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2.5 bg-gradient-to-r from-[#b8955a]/35 to-transparent"
                aria-hidden
              />
              <LuaEditor
                value={source}
                onChange={(next) => {
                  setSource(next);
                }}
                highlightLine={result?.line ?? null}
                onRun={() => {
                  void run();
                }}
              />
            </div>
            <p className="border-t border-[var(--line)] bg-[rgba(14,18,24,0.35)] px-3 py-1.5 text-[11px] text-[rgba(239,230,212,0.45)]">
              Atalho: Ctrl ou ⌘ + Enter · print vai para a luneta · bibliotecas: base, string,
              table, math, utf8, coroutine
            </p>
          </section>

          <div className="min-h-[280px] lg:min-h-0">
            <OutputPanel result={result} running={running} />
          </div>
        </div>

        <footer className="animate-rise-delay-2 mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[rgba(239,230,212,0.42)]">
          <span>Wii Lua · família do projeto wii, ao lado do Wii Net</span>
          <span>sem io, os, package ou debug — só o núcleo da linguagem</span>
        </footer>
      </div>
    </div>
  );
}
