import type { Device, ScanSummary } from "./types";
import { listLocalInterfaces, pickDefaultCidr } from "./network";
import { sweepCidr } from "./scanner";

interface MonitorState {
  devices: Map<string, Device>;
  scan: ScanSummary | null;
  monitoredCidr: string | null;
  scanPromise: Promise<void> | null;
}

const globalKey = "__wii_net_monitor_state__";

function getState(): MonitorState {
  const g = globalThis as typeof globalThis & { [globalKey]?: MonitorState };
  if (!g[globalKey]) {
    g[globalKey] = {
      devices: new Map(),
      scan: null,
      monitoredCidr: null,
      scanPromise: null,
    };
  }
  return g[globalKey];
}

function nowIso() {
  return new Date().toISOString();
}

function summarize(state: MonitorState): ScanSummary | null {
  if (!state.scan) return null;
  const devices = [...state.devices.values()].sort((a, b) => {
    const pa = a.ip.split(".").map(Number);
    const pb = b.ip.split(".").map(Number);
    for (let i = 0; i < 4; i++) {
      const d = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  });
  return {
    ...state.scan,
    onlineCount: devices.filter((d) => d.status === "online").length,
    offlineCount: devices.filter((d) => d.status === "offline").length,
    devices,
  };
}

export function getMonitorSnapshot() {
  const state = getState();
  const interfaces = listLocalInterfaces();
  return {
    interfaces,
    scan: summarize(state),
    monitoredCidr: state.monitoredCidr ?? pickDefaultCidr(interfaces),
  };
}

export function isScanning(): boolean {
  return Boolean(getState().scan?.scanning);
}

export async function startScan(cidr: string, interfaceName?: string | null): Promise<ScanSummary> {
  const state = getState();
  if (state.scan?.scanning) {
    throw new Error("Já existe uma varredura em andamento.");
  }

  const startedAt = nowIso();
  state.monitoredCidr = cidr;
  state.scan = {
    cidr,
    interfaceName: interfaceName ?? null,
    startedAt,
    finishedAt: null,
    scanning: true,
    totalHosts: 0,
    onlineCount: 0,
    offlineCount: 0,
    devices: [],
  };

  // Mark previously known devices offline until rediscovered
  for (const device of state.devices.values()) {
    device.status = "offline";
  }

  const run = async () => {
    try {
      const hits = await sweepCidr(cidr);
      const seen = new Set<string>();
      const ts = nowIso();

      for (const hit of hits) {
        seen.add(hit.ip);
        const prev = state.devices.get(hit.ip);
        state.devices.set(hit.ip, {
          ip: hit.ip,
          mac: hit.mac ?? prev?.mac ?? null,
          hostname: hit.hostname ?? prev?.hostname ?? null,
          status: hit.online ? "online" : "offline",
          lastSeen: hit.online ? ts : prev?.lastSeen ?? null,
          firstSeen: prev?.firstSeen ?? ts,
          interfaceName: interfaceName ?? prev?.interfaceName,
        });
      }

      // Devices not in this sweep remain offline (already marked)
      for (const [ip, device] of state.devices) {
        if (!seen.has(ip) && device.status === "online") {
          device.status = "offline";
        }
      }

      state.scan = {
        cidr,
        interfaceName: interfaceName ?? null,
        startedAt,
        finishedAt: nowIso(),
        scanning: false,
        totalHosts: hits.length,
        onlineCount: 0,
        offlineCount: 0,
        devices: [],
      };
    } catch (err) {
      state.scan = {
        cidr,
        interfaceName: interfaceName ?? null,
        startedAt,
        finishedAt: nowIso(),
        scanning: false,
        totalHosts: 0,
        onlineCount: 0,
        offlineCount: 0,
        devices: [],
        error: err instanceof Error ? err.message : "Falha na varredura",
      };
    } finally {
      state.scanPromise = null;
    }
  };

  state.scanPromise = run();
  // Return immediately with scanning=true; client polls /api/status
  return summarize(state)!;
}

export async function waitForScan(): Promise<void> {
  const p = getState().scanPromise;
  if (p) await p;
}
