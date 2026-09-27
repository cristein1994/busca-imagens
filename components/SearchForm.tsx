"use client";

import { FormEvent, useState } from "react";

type Props = {
  onSearch: (query: string) => void;
  loading: boolean;
  disabled?: boolean;
};

export function SearchForm({ onSearch, loading, disabled }: Props) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading || disabled) return;
    onSearch(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-rise-delay mt-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
    >
      <label className="sr-only" htmlFor="youtube-query">
        Buscar no YouTube
      </label>
      <input
        id="youtube-query"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ex.: inteligência artificial, receitas, podcast…"
        disabled={disabled || loading}
        className="min-h-14 flex-1 rounded-none border-0 border-b-2 border-ink/25 bg-transparent px-1 text-lg text-ink outline-none transition placeholder:text-ink/40 focus:border-accent disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || loading || !query.trim()}
        className="min-h-14 shrink-0 bg-ink px-7 text-sm font-semibold tracking-wide text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Buscando…" : "Buscar vídeos"}
      </button>
    </form>
  );
}
