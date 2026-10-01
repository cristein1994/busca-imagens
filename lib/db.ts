import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export type LinkRow = {
  code: string;
  token: string;
  target_url: string;
  label: string | null;
  smart_logger: number;
  created_at: string;
};

export type VisitRow = {
  id: number;
  code: string;
  ip: string | null;
  local_ip: string | null;
  user_agent: string | null;
  referer: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  isp: string | null;
  hostname: string | null;
  timezone: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  bot_name: string | null;
  screen_size: string | null;
  orientation: string | null;
  connection_type: string | null;
  battery: string | null;
  charging: string | null;
  gpu: string | null;
  incognito: string | null;
  adblocker: string | null;
  vpn_proxy: string | null;
  tor: string | null;
  vm: string | null;
  source: string | null;
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

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  typeSql: string,
) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`);
  }
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
      smart_logger INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL REFERENCES links(code) ON DELETE CASCADE,
      ip TEXT,
      local_ip TEXT,
      user_agent TEXT,
      referer TEXT,
      language TEXT,
      country TEXT,
      city TEXT,
      region TEXT,
      isp TEXT,
      hostname TEXT,
      timezone TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      bot_name TEXT,
      screen_size TEXT,
      orientation TEXT,
      connection_type TEXT,
      battery TEXT,
      charging TEXT,
      gpu TEXT,
      incognito TEXT,
      adblocker TEXT,
      vpn_proxy TEXT,
      tor TEXT,
      vm TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_visits_code_created
      ON visits(code, created_at DESC);
  `);

  ensureColumn(db, "links", "smart_logger", "INTEGER NOT NULL DEFAULT 1");
  const visitCols: [string, string][] = [
    ["local_ip", "TEXT"],
    ["region", "TEXT"],
    ["hostname", "TEXT"],
    ["timezone", "TEXT"],
    ["browser", "TEXT"],
    ["os", "TEXT"],
    ["device", "TEXT"],
    ["bot_name", "TEXT"],
    ["screen_size", "TEXT"],
    ["orientation", "TEXT"],
    ["connection_type", "TEXT"],
    ["battery", "TEXT"],
    ["charging", "TEXT"],
    ["gpu", "TEXT"],
    ["incognito", "TEXT"],
    ["adblocker", "TEXT"],
    ["vpn_proxy", "TEXT"],
    ["tor", "TEXT"],
    ["vm", "TEXT"],
    ["source", "TEXT"],
  ];
  for (const [col, typ] of visitCols) ensureColumn(db, "visits", col, typ);

  global.__pulseDb = db;
  return db;
}

export function createLink(input: {
  code: string;
  token: string;
  targetUrl: string;
  label?: string;
  smartLogger?: boolean;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO links (code, token, target_url, label, smart_logger)
     VALUES (@code, @token, @target_url, @label, @smart_logger)`,
  ).run({
    code: input.code,
    token: input.token,
    target_url: input.targetUrl,
    label: input.label ?? null,
    smart_logger: input.smartLogger === false ? 0 : 1,
  });
}

export function getLinkByCode(code: string): LinkRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM links WHERE code = ?`)
    .get(code) as LinkRow | undefined;
}

export function listLinks(): LinkRow[] {
  return getDb()
    .prepare(`SELECT * FROM links ORDER BY created_at DESC`)
    .all() as LinkRow[];
}

export type VisitInput = {
  code: string;
  ip?: string | null;
  localIp?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  language?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  isp?: string | null;
  hostname?: string | null;
  timezone?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  botName?: string | null;
  screenSize?: string | null;
  orientation?: string | null;
  connectionType?: string | null;
  battery?: string | null;
  charging?: string | null;
  gpu?: string | null;
  incognito?: string | null;
  adblocker?: string | null;
  vpnProxy?: string | null;
  tor?: string | null;
  vm?: string | null;
  source?: string | null;
};

export function insertVisit(input: VisitInput) {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO visits (
        code, ip, local_ip, user_agent, referer, language,
        country, city, region, isp, hostname, timezone,
        browser, os, device, bot_name, screen_size, orientation,
        connection_type, battery, charging, gpu, incognito, adblocker,
        vpn_proxy, tor, vm, source
      ) VALUES (
        @code, @ip, @local_ip, @user_agent, @referer, @language,
        @country, @city, @region, @isp, @hostname, @timezone,
        @browser, @os, @device, @bot_name, @screen_size, @orientation,
        @connection_type, @battery, @charging, @gpu, @incognito, @adblocker,
        @vpn_proxy, @tor, @vm, @source
      )`,
    )
    .run({
      code: input.code,
      ip: input.ip ?? null,
      local_ip: input.localIp ?? null,
      user_agent: input.userAgent ?? null,
      referer: input.referer ?? null,
      language: input.language ?? null,
      country: input.country ?? null,
      city: input.city ?? null,
      region: input.region ?? null,
      isp: input.isp ?? null,
      hostname: input.hostname ?? null,
      timezone: input.timezone ?? null,
      browser: input.browser ?? null,
      os: input.os ?? null,
      device: input.device ?? null,
      bot_name: input.botName ?? null,
      screen_size: input.screenSize ?? null,
      orientation: input.orientation ?? null,
      connection_type: input.connectionType ?? null,
      battery: input.battery ?? null,
      charging: input.charging ?? null,
      gpu: input.gpu ?? null,
      incognito: input.incognito ?? null,
      adblocker: input.adblocker ?? null,
      vpn_proxy: input.vpnProxy ?? null,
      tor: input.tor ?? null,
      vm: input.vm ?? null,
      source: input.source ?? null,
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

export function visitToJson(v: VisitRow) {
  return {
    id: v.id,
    ip: v.ip,
    localIp: v.local_ip,
    userAgent: v.user_agent,
    referer: v.referer,
    language: v.language,
    country: v.country,
    city: v.city,
    region: v.region,
    isp: v.isp,
    hostname: v.hostname,
    timezone: v.timezone,
    browser: v.browser,
    os: v.os,
    device: v.device,
    botName: v.bot_name,
    screenSize: v.screen_size,
    orientation: v.orientation,
    connectionType: v.connection_type,
    battery: v.battery,
    charging: v.charging,
    gpu: v.gpu,
    incognito: v.incognito,
    adblocker: v.adblocker,
    vpnProxy: v.vpn_proxy,
    tor: v.tor,
    vm: v.vm,
    source: v.source,
    createdAt: v.created_at,
  };
}
