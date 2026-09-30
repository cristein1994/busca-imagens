import type { LocalRecord } from "./types";

function uid() {
  return `file:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const split = (line: string) => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = split(lines[0]).map((h, i) => h || `col_${i + 1}`);
  return lines.slice(1, 501).map((line) => {
    const values = split(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function parseJsonRows(text: string): Array<Record<string, string>> {
  const data = JSON.parse(text) as unknown;
  const asRows = Array.isArray(data) ? data : [data];
  return asRows.slice(0, 500).map((item) => {
    if (item && typeof item === "object") {
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        row[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
      return row;
    }
    return { value: String(item) };
  });
}

function parseTextRows(text: string): Array<Record<string, string>> {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 500)
    .map((line, i) => ({ linha: String(i + 1), texto: line }));
}

export async function importLocalFile(
  file: File,
  tags: string[] = [],
  notes = "",
): Promise<LocalRecord> {
  const text = await file.text();
  const lower = file.name.toLowerCase();
  let rows: Array<Record<string, string>> = [];

  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) {
    rows = parseCsv(text);
  } else if (lower.endsWith(".json")) {
    rows = parseJsonRows(text);
  } else {
    rows = parseTextRows(text);
  }

  return {
    id: uid(),
    fileName: file.name,
    importedAt: new Date().toISOString(),
    tags: tags.filter(Boolean),
    notes,
    mimeType: file.type || "text/plain",
    size: file.size,
    preview: text.slice(0, 400),
    rows,
  };
}
