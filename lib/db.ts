import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export type LinkRow = {
  code: string;
  token: string;
  target_url: string;
  label: string | null;
  created_at: string;
};

export type VisitRow = {
  id: number;
  code: string;
  ip: string | null;
  user_agent: string | null;
  referer: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  isp: string | null;
  created_at: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __pulseDb: Database.Database | undefined;
}

function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function dbPath() {
  return path.join(dataDir(), "pulse.db");
}

export function getDb() {
  if (global.__pulseDb) return global.__pulseDb;

  fs.mkdirSync(dataDir(), { recursive: true });
  const db = new Database(dbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      code TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      target_url TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL REFERENCES links(code) ON DELETE CASCADE,
      ip TEXT,
      user_agent TEXT,
      referer TEXT,
      language TEXT,
      country TEXT,
      city TEXT,
      isp TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_visits_code_created
      ON visits(code, created_at DESC);
  `);

  global.__pulseDb = db;
  return db;
}

export function createLink(input: {
  code: string;
  token: string;
  targetUrl: string;
  label?: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO links (code, token, target_url, label)
     VALUES (@code, @token, @target_url, @label)`,
  ).run({
    code: input.code,
    token: input.token,
    target_url: input.targetUrl,
    label: input.label ?? null,
  });
}

export function getLinkByCode(code: string): LinkRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM links WHERE code = ?`)
    .get(code) as LinkRow | undefined;
}

export function getLinkByToken(token: string): LinkRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM links WHERE token = ?`)
    .get(token) as LinkRow | undefined;
}

export function listLinks(): LinkRow[] {
  return getDb()
    .prepare(`SELECT * FROM links ORDER BY created_at DESC`)
    .all() as LinkRow[];
}

export function insertVisit(input: {
  code: string;
  ip?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  language?: string | null;
  country?: string | null;
  city?: string | null;
  isp?: string | null;
}) {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO visits
        (code, ip, user_agent, referer, language, country, city, isp)
       VALUES
        (@code, @ip, @user_agent, @referer, @language, @country, @city, @isp)`,
    )
    .run({
      code: input.code,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      referer: input.referer ?? null,
      language: input.language ?? null,
      country: input.country ?? null,
      city: input.city ?? null,
      isp: input.isp ?? null,
    });
  return Number(info.lastInsertRowid);
}

export function getVisits(code: string, afterId = 0): VisitRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM visits
       WHERE code = ? AND id > ?
       ORDER BY id ASC`,
    )
    .all(code, afterId) as VisitRow[];
}

export function countVisits(code: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM visits WHERE code = ?`)
    .get(code) as { n: number };
  return row.n;
}
