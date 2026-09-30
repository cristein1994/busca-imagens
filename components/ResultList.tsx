import type { SearchResult, SearchSource } from "@/lib/types";

const labels: Record<SearchSource, string> = {
  wikipedia: "Wikipedia",
  duckduckgo: "DuckDuckGo",
  openlibrary: "Open Library",
  local: "Arquivo local",
};

const tones: Record<SearchSource, string> = {
  wikipedia: "bg-tide-500/15 text-tide-600",
  duckduckgo: "bg-ember-500/15 text-ember-600",
  openlibrary: "bg-ink-800/10 text-ink-700",
  local: "bg-ink-900 text-mist-50",
};

export function ResultList({
  results,
  emptyLabel = "Nenhum resultado ainda.",
}: {
  results: SearchResult[];
  emptyLabel?: string;
}) {
  if (results.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-900/20 bg-white/40 px-4 py-8 text-center text-ink-600">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {results.map((item, index) => (
        <li
          key={item.id}
          className="animate-rise rounded-xl border border-ink-900/10 bg-white/70 p-4 shadow-soft backdrop-blur-sm"
          style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${tones[item.source]}`}>
              {labels[item.source]}
            </span>
            {item.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded px-2 py-0.5 text-xs text-ink-600 ring-1 ring-ink-900/10"
              >
                {tag}
              </span>
            ))}
          </div>
          {item.url.startsWith("#") ? (
            <h3 className="font-display text-lg font-semibold text-ink-900">{item.title}</h3>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="font-display text-lg font-semibold text-ink-900 underline-offset-4 hover:underline"
            >
              {item.title}
            </a>
          )}
          <p className="mt-1 text-sm leading-relaxed text-ink-700">{item.snippet}</p>
          <p className="mt-2 text-xs text-ink-600/80">
            {new Date(item.fetchedAt).toLocaleString("pt-BR")}
          </p>
        </li>
      ))}
    </ul>
  );
}
