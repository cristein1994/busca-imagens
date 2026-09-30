export type SearchSource = "wikipedia" | "duckduckgo" | "openlibrary" | "local";

export type SearchResult = {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: SearchSource;
  tags?: string[];
  fetchedAt: string;
};

export type HistoryEntry = {
  id: string;
  query: string;
  mode: "surface" | "local" | "dashboard";
  resultCount: number;
  createdAt: string;
  sources: SearchSource[];
};

export type LocalRecord = {
  id: string;
  fileName: string;
  importedAt: string;
  tags: string[];
  notes: string;
  mimeType: string;
  size: number;
  preview: string;
  rows: Array<Record<string, string>>;
};

export type DashboardFilters = {
  query: string;
  sources: SearchSource[];
  tag: string;
  from: string;
  to: string;
};
