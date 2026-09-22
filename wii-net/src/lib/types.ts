export type DeviceStatus = "online" | "offline" | "unknown";

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  netmask: string;
  cidr: string;
  family: "IPv4";
  internal: boolean;
  mac?: string;
}

export interface Device {
  ip: string;
  mac: string | null;
  hostname: string | null;
  status: DeviceStatus;
  lastSeen: string | null;
  firstSeen: string | null;
  interfaceName?: string;
}

export interface ScanSummary {
  cidr: string;
  interfaceName: string | null;
  startedAt: string;
  finishedAt: string | null;
  scanning: boolean;
  totalHosts: number;
  onlineCount: number;
  offlineCount: number;
  devices: Device[];
  error?: string;
}

export interface StatusResponse {
  interfaces: NetworkInterfaceInfo[];
  scan: ScanSummary | null;
  monitoredCidr: string | null;
}
