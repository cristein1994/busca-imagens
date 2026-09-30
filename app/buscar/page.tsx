"use client";

import { FormEvent, useState } from "react";
import { ResultList } from "@/components/ResultList";
import {
  getCachedResults,
  mergeCachedResults,
  pushHistory,
} from "@/lib/storage";
import type { SearchResult, SearchSource } from "@/lib/types";

const SOURCE_OPTIONS: Array<{ id: SearchSource; label: string }> = [
  { id: "wikipedia", label: "Wikipedia" },
  { id: "duckduckgo", label: "DuckDuckGo" },
  { id: "openlibrary", label: "Open Library" },
];

export default function BuscarPage() {
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<SearchSource[]>([
    "wikipedia",
    "duckduckgo",
    "openlibrary",
  ]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleSource(id: SearchSource) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim() || sources.length === 0 || loading) return;
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, sources }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na busca");
      const next = (data.results ?? []) as SearchResult[];
      setResults(next);
      setErrors(data.errors ?? []);
      mergeCachedResults(next);
      pushHistory({
        id: `hist:${Date.now()}`,
        query: query.trim(),
        mode: "surface",
        resultCount: next.length,
        createdAt: new Date().toISOString(),
        sources,
      });
    } catch (err) {
      setErrors([err instanceof Error ? err.message : String(err)]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function loadCache() {
    setResults(getCachedResults().filter((r) => r.source !== "local"));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl animate-rise">
        <p className="text-xs uppercase tracking-[0.2em] text-tide-600">Módulo 1</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink-900">Busca pública</h1>
        <p className="mt-3 text-ink-700">
          Consulta APIs abertas da surface web. Nada de .onion, Tor ou dumps.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mt-8 animate-rise space-y-4 rounded-2xl border border-ink-900/10 bg-white/65 p-5 shadow-soft backdrop-blur"
        style={{ animationDelay: "80ms" }}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Consulta</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: satélite observação Terra"
            className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-800">Fontes</legend>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map((opt) => {
              const on = sources.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleSource(opt.id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    on
                      ? "bg-ink-900 text-white"
                      : "bg-mist-100 text-ink-700 ring-1 ring-ink-900/10"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || !query.trim() || sources.length === 0}
            className="rounded-md bg-tide-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-tide-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
          <button
            type="button"
            onClick={loadCache}
            className="rounded-md border border-ink-900/15 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-mist-100"
          >
            Carregar cache local
          </button>
        </div>
      </form>

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-ember-500/30 bg-ember-400/10 px-4 py-3 text-sm text-ink-800">
          {errors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Resultados</h2>
          <span className="text-sm text-ink-600">{results.length} itens</span>
        </div>
        <ResultList results={results} emptyLabel="Faça uma busca para ver resultados públicos." />
      </section>
    </div>
  );
}
