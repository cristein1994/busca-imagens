"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { importLocalFile } from "@/lib/local-import";
import {
  deleteLocalRecord,
  getLocalRecords,
  pushHistory,
  saveLocalRecords,
  searchLocalRecords,
  upsertLocalRecord,
} from "@/lib/storage";
import type { LocalRecord, SearchResult } from "@/lib/types";
import { ResultList } from "@/components/ResultList";

export default function ArquivosPage() {
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [tagsInput, setTagsInput] = useState("notas, lead");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [hits, setHits] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRecords(getLocalRecords());
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [records]);

  async function onImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setMessage("Selecione um arquivo CSV, JSON ou TXT.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const record = await importLocalFile(file, tags, notes.trim());
      const next = upsertLocalRecord(record);
      setRecords(next);
      setMessage(`Importado: ${record.fileName} (${record.rows.length} linhas indexadas).`);
      form.reset();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const next = searchLocalRecords(query, tagFilter);
    setHits(next);
    pushHistory({
      id: `hist:${Date.now()}`,
      query: query.trim() || tagFilter.trim() || "*",
      mode: "local",
      resultCount: next.length,
      createdAt: new Date().toISOString(),
      sources: ["local"],
    });
  }

  function removeRecord(id: string) {
    const next = deleteLocalRecord(id);
    setRecords(next);
    setHits(searchLocalRecords(query, tagFilter));
  }

  function clearAll() {
    saveLocalRecords([]);
    setRecords([]);
    setHits([]);
    setMessage("Arquivos locais limpos neste navegador.");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl animate-rise">
        <p className="text-xs uppercase tracking-[0.2em] text-tide-600">Módulo 2</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink-900">Arquivos locais</h1>
        <p className="mt-3 text-ink-700">
          Organize e pesquise dados que você já possui. Tudo fica no localStorage deste navegador.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form
          onSubmit={onImport}
          className="animate-rise space-y-4 rounded-2xl border border-ink-900/10 bg-white/65 p-5 shadow-soft"
        >
          <h2 className="font-display text-xl font-semibold">Importar</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Arquivo (.csv / .json / .txt)</span>
            <input
              name="file"
              type="file"
              accept=".csv,.tsv,.json,.txt,text/plain,application/json,text/csv"
              className="block w-full text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Tags (vírgula)</span>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Notas</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
          >
            {busy ? "Importando…" : "Importar arquivo"}
          </button>
          {message && <p className="text-sm text-ink-700">{message}</p>}
        </form>

        <form
          onSubmit={onSearch}
          className="animate-rise space-y-4 rounded-2xl border border-ink-900/10 bg-white/65 p-5 shadow-soft"
          style={{ animationDelay: "80ms" }}
        >
          <h2 className="font-display text-xl font-semibold">Pesquisar no acervo</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Texto</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="nome, e-mail, termo…"
              className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Filtrar tag</span>
            <input
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              list="local-tags"
              placeholder="ex.: lead"
              className="w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2.5 outline-none ring-tide-500/40 focus:ring-2"
            />
            <datalist id="local-tags">
              {allTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <button
            type="submit"
            className="rounded-md bg-tide-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-tide-600"
          >
            Buscar no local
          </button>
        </form>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            Acervo ({records.length})
          </h2>
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-ink-600 underline-offset-2 hover:underline"
          >
            Limpar tudo
          </button>
        </div>
        {records.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-900/20 bg-white/40 px-4 py-8 text-center text-ink-600">
            Nenhum arquivo importado ainda. Use o sample em{" "}
            <code className="rounded bg-mist-100 px-1">data/samples/</code>.
          </p>
        ) : (
          <ul className="space-y-3">
            {records.map((record) => (
              <li
                key={record.id}
                className="rounded-xl border border-ink-900/10 bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{record.fileName}</h3>
                    <p className="mt-1 text-sm text-ink-700">
                      {record.rows.length} linhas · {(record.size / 1024).toFixed(1)} KB ·{" "}
                      {new Date(record.importedAt).toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      Tags: {record.tags.join(", ") || "—"}
                    </p>
                    {record.notes && (
                      <p className="mt-2 text-sm text-ink-700">{record.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRecord(record.id)}
                    className="rounded-md border border-ink-900/15 px-3 py-1.5 text-sm hover:bg-mist-100"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-2xl font-semibold text-ink-900">Hits locais</h2>
        <ResultList results={hits} emptyLabel="Pesquise o acervo para listar matches." />
      </section>
    </div>
  );
}
