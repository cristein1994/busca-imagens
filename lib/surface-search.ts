import type { SearchResult, SearchSource } from "./types";

function uid(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

async function wikipediaSearch(query: string): Promise<SearchResult[]> {
  const url = new URL("https://pt.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srlimit", "8");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const data = (await res.json()) as {
    query?: { search?: Array<{ title: string; snippet: string; pageid: number }> };
  };

  const now = new Date().toISOString();
  return (data.query?.search ?? []).map((item) => ({
    id: uid(`wiki-${item.pageid}`),
    title: item.title,
    snippet: item.snippet.replace(/<[^>]+>/g, ""),
    url: `https://pt.wikipedia.org/?curid=${item.pageid}`,
    source: "wikipedia" as const,
    tags: ["wikipedia", "público"],
    fetchedAt: now,
  }));
}

async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_redirect", "1");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);
  const data = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Topics?: unknown[] }>;
  };

  const now = new Date().toISOString();
  const results: SearchResult[] = [];

  if (data.Heading && (data.AbstractText || data.AbstractURL)) {
    results.push({
      id: uid("ddg-abs"),
      title: data.Heading,
      snippet: data.AbstractText || "Resumo DuckDuckGo Instant Answer",
      url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      source: "duckduckgo",
      tags: ["duckduckgo", "público"],
      fetchedAt: now,
    });
  }

  for (const topic of data.RelatedTopics ?? []) {
    if (topic.Text && topic.FirstURL) {
      results.push({
        id: uid("ddg-rel"),
        title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 80),
        snippet: topic.Text,
        url: topic.FirstURL,
        source: "duckduckgo",
        tags: ["duckduckgo", "relacionado"],
        fetchedAt: now,
      });
    }
  }

  if (results.length === 0) {
    results.push({
      id: uid("ddg-fallback"),
      title: `Buscar “${query}” no DuckDuckGo`,
      snippet: "Abrir busca pública na surface web (sem deep web).",
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      source: "duckduckgo",
      tags: ["duckduckgo", "atalho"],
      fetchedAt: now,
    });
  }

  return results.slice(0, 10);
}

async function openLibrarySearch(query: string): Promise<SearchResult[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Open Library HTTP ${res.status}`);
  const data = (await res.json()) as {
    docs?: Array<{
      key: string;
      title?: string;
      author_name?: string[];
      first_publish_year?: number;
      subject?: string[];
    }>;
  };

  const now = new Date().toISOString();
  return (data.docs ?? []).map((doc) => ({
    id: uid(`ol-${doc.key}`),
    title: doc.title || "Sem título",
    snippet: [
      doc.author_name?.slice(0, 3).join(", "),
      doc.first_publish_year ? `publ. ${doc.first_publish_year}` : null,
      doc.subject?.slice(0, 3).join(", "),
    ]
      .filter(Boolean)
      .join(" · "),
    url: `https://openlibrary.org${doc.key}`,
    source: "openlibrary" as const,
    tags: ["openlibrary", "catálogo"],
    fetchedAt: now,
  }));
}

export async function runSurfaceSearch(
  query: string,
  sources: SearchSource[] = ["wikipedia", "duckduckgo", "openlibrary"],
): Promise<{ results: SearchResult[]; errors: string[] }> {
  const q = query.trim();
  if (!q) return { results: [], errors: ["Consulta vazia"] };

  const tasks: Array<Promise<SearchResult[]>> = [];
  if (sources.includes("wikipedia")) tasks.push(wikipediaSearch(q));
  if (sources.includes("duckduckgo")) tasks.push(duckDuckGoSearch(q));
  if (sources.includes("openlibrary")) tasks.push(openLibrarySearch(q));

  const settled = await Promise.allSettled(tasks);
  const results: SearchResult[] = [];
  const errors: string[] = [];

  for (const item of settled) {
    if (item.status === "fulfilled") results.push(...item.value);
    else errors.push(item.reason instanceof Error ? item.reason.message : String(item.reason));
  }

  return { results, errors };
}
