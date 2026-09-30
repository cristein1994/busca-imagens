import type { HistoryEntry, LocalRecord, SearchResult } from "./types";

const HISTORY_KEY = "lince.history.v1";
const RESULTS_KEY = "lince.results.v1";
const LOCAL_KEY = "lince.local.v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getHistory(): HistoryEntry[] {
  return readJson<HistoryEntry[]>(HISTORY_KEY, []);
}

export function pushHistory(entry: HistoryEntry) {
  const next = [entry, ...getHistory()].slice(0, 80);
  writeJson(HISTORY_KEY, next);
  return next;
}

export function clearHistory() {
  writeJson(HISTORY_KEY, []);
}

export function getCachedResults(): SearchResult[] {
  return readJson<SearchResult[]>(RESULTS_KEY, []);
}

export function mergeCachedResults(results: SearchResult[]) {
  const map = new Map<string, SearchResult>();
  for (const item of [...results, ...getCachedResults()]) {
    map.set(item.id, item);
  }
  const next = Array.from(map.values()).slice(0, 300);
  writeJson(RESULTS_KEY, next);
  return next;
}

export function getLocalRecords(): LocalRecord[] {
  return readJson<LocalRecord[]>(LOCAL_KEY, []);
}

export function saveLocalRecords(records: LocalRecord[]) {
  writeJson(LOCAL_KEY, records);
  return records;
}

export function upsertLocalRecord(record: LocalRecord) {
  const all = getLocalRecords();
  const idx = all.findIndex((r) => r.id === record.id);
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  return saveLocalRecords(all);
}

export function deleteLocalRecord(id: string) {
  return saveLocalRecords(getLocalRecords().filter((r) => r.id !== id));
}

export function searchLocalRecords(query: string, tag = ""): SearchResult[] {
  const q = query.trim().toLowerCase();
  const t = tag.trim().toLowerCase();
  const now = new Date().toISOString();

  return getLocalRecords()
    .filter((record) => {
      const tagOk = !t || record.tags.some((x) => x.toLowerCase().includes(t));
      if (!tagOk) return false;
      if (!q) return true;
      const hay = [
        record.fileName,
        record.notes,
        record.preview,
        record.tags.join(" "),
        ...record.rows.flatMap((row) => Object.values(row)),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .map((record) => ({
      id: `local:${record.id}`,
      title: record.fileName,
      snippet:
        record.notes ||
        record.preview.slice(0, 220) ||
        `${record.rows.length} linhas · tags: ${record.tags.join(", ") || "—"}`,
      url: `#local-${record.id}`,
      source: "local" as const,
      tags: record.tags,
      fetchedAt: now,
    }));
}
