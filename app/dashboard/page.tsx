"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ResultList } from "@/components/ResultList";
import {
  clearHistory,
  getCachedResults,
  getHistory,
  pushHistory,
  searchLocalRecords,
} from "@/lib/storage";
import type { HistoryEntry, SearchResult, SearchSource } from "@/lib/types";

const ALL_SOURCES: SearchSource[] = [
  "wikipedia",
  "duckduckgo",
  "openlibrary",
  "local",
];

export default function DashboardPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sources, setSources] = useState<SearchSource[]>([...ALL_SOURCES]);

  useEffect(() => {
    setHistory(getHistory());
    setResults([...getCachedResults(), ...searchLocalRecords("")]);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const t = tag.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() : null;

    return results.filter((item) => {
      if (!sources.includes(item.source)) return false;
      if (q) {
        const hay = `${item.title} ${item.snippet} ${(item.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (t && !(item.tags ?? []).some((x) => x.toLowerCase().includes(t))) return false;
      const ts = new Date(item.fetchedAt).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs + 86_400_000) return false;
      return true;
    });
  }, [results, query, tag, from, to, sources]);

  function toggleSource(id: SearchSource) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    pushHistory({
      id: `hist:${Date.now()}`,
      query: query.trim() || tag.trim() || "filtro dashboard",
      mode: "dashboard",
      resultCount: filtered.length,
      createdAt: new Date().toISOString(),
      sources,
    });
    setHistory(getHistory());
  }

  function refresh() {
    setHistory(getHistory());
    setResults([...getCachedResults(), ...searchLocalRecords("")]);
  }

  function wipeHistory() {
    clearHistory();
    setHistory([]);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl animate-rise">
        <p className="text-xs uppercase tracking-[0.2em] text-tide-600">Módulo 3</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink-900">Dashboard</h1>
        <p className="mt-3 text-ink-700">
          Cruze resultados em cache, hits locais e histórico de consultas com filtros.
        </p>
      </header>

      <form
        onSubmit={applyFilters}
        className="mt-8 animate-rise grid gap-4 rounded-2xl border border-ink-900/10 bg-white/65 p-5 shadow-soft md:grid-cols-2"
      >
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">Texto</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
            placeholder="filtrar título/snippet/tags"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Tag</span>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">De</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Até</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
            />
          </label>
        </div>
        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-medium">Fontes</legend>
          <div className="flex flex-wrap gap-2">
            {ALL_SOURCES.map((src) => {
              const on = sources.includes(src);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => toggleSource(src)}
                  className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
                    on ? "bg-ink-900 text-white" : "bg-mist-100 text-ink-700 ring-1 ring-ink-900/10"
                  }`}
                >
                  {src}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-ember-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
          >
            Aplicar e registrar
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-ink-900/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-mist-100"
          >
            Atualizar dados
          </button>
        </div>
      </form>

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Histórico</h2>
            <button
              type="button"
              onClick={wipeHistory}
              className="text-sm text-ink-600 underline-offset-2 hover:underline"
            >
              Limpar
            </button>
          </div>
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-900/20 bg-white/40 px-4 py-8 text-center text-ink-600">
              Sem consultas registradas.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-ink-900/10 bg-white/70 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="font-medium text-ink-900">{item.query}</strong>
                    <span className="text-xs uppercase tracking-wide text-ink-600">
                      {item.mode}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-700">
                    {item.resultCount} resultados · {item.sources.join(", ")}
                  </p>
                  <p className="text-xs text-ink-600">
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Resultados filtrados</h2>
            <span className="text-sm text-ink-600">{filtered.length} itens</span>
          </div>
          <ResultList
            results={filtered}
            emptyLabel="Nada combina com os filtros. Busque ou importe dados antes."
          />
        </div>
      </section>
    </div>
  );
}
