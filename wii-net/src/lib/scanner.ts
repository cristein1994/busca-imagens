import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import dns from "node:dns/promises";
import { hostsInCidr } from "./network";

const execFileAsync = promisify(execFile);

const PING_CONCURRENCY = 64;
const PING_TIMEOUT_SEC = 1;

async function pingHost(ip: string): Promise<boolean> {
  try {
    await execFileAsync("ping", ["-c", "1", "-W", String(PING_TIMEOUT_SEC), ip], {
      timeout: (PING_TIMEOUT_SEC + 1) * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]!, i);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

/** Read Linux ARP table (`/proc/net/arp`). */
export async function readArpTable(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const raw = await fs.readFile("/proc/net/arp", "utf8");
    const lines = raw.trim().split("\n").slice(1);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;
      const ip = parts[0]!;
      const mac = parts[3]!;
      if (!mac || mac === "00:00:00:00:00:00") continue;
      map.set(ip, mac.toLowerCase());
    }
  } catch {
    // Non-Linux or no permission — return empty
  }
  return map;
}

export async function resolveHostname(ip: string): Promise<string | null> {
  try {
    const names = await dns.reverse(ip);
    return names[0] ?? null;
  } catch {
    return null;
  }
}

export interface SweepHit {
  ip: string;
  online: boolean;
  mac: string | null;
  hostname: string | null;
}

/**
 * ICMP ping sweep + ARP/DNS enrichment for a private CIDR.
 * Must run on a machine that is on the target LAN.
 */
export async function sweepCidr(
  cidr: string,
  options?: { onProgress?: (done: number, total: number) => void },
): Promise<SweepHit[]> {
  const hosts = hostsInCidr(cidr);
  const onlineFlags = await mapPool(hosts, PING_CONCURRENCY, async (ip, index) => {
    const online = await pingHost(ip);
    options?.onProgress?.(index + 1, hosts.length);
    return online;
  });

  // Re-read ARP after ping so new neighbors populate the table
  const arp = await readArpTable();

  const candidates: { ip: string; online: boolean; mac: string | null }[] = [];
  for (let i = 0; i < hosts.length; i++) {
    const ip = hosts[i]!;
    const online = onlineFlags[i]!;
    const mac = arp.get(ip) ?? null;
    if (!online && !mac) continue;
    candidates.push({ ip, online: online || Boolean(mac), mac });
  }

  const hostSet = new Set(hosts);
  const known = new Set(candidates.map((c) => c.ip));
  for (const [ip, mac] of arp) {
    if (!hostSet.has(ip) || known.has(ip)) continue;
    candidates.push({ ip, online: true, mac });
  }

  const hostnames = await mapPool(candidates, 16, async (c) => resolveHostname(c.ip));
  const hits: SweepHit[] = candidates.map((c, i) => ({
    ip: c.ip,
    online: c.online,
    mac: c.mac,
    hostname: hostnames[i] ?? null,
  }));

  hits.sort((a, b) => {
    const pa = a.ip.split(".").map(Number);
    const pb = b.ip.split(".").map(Number);
    for (let i = 0; i < 4; i++) {
      const d = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  });

  return hits;
}
