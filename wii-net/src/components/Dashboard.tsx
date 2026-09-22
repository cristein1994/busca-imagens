"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Device, NetworkInterfaceInfo, StatusResponse } from "@/lib/types";

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `há ${hr} h`;
  return new Date(iso).toLocaleString("pt-BR");
}

function StatusDot({ status }: { status: Device["status"] }) {
  const color =
    status === "online"
      ? "bg-[var(--signal-online)] shadow-[0_0_12px_rgba(62,207,142,0.55)]"
      : status === "offline"
        ? "bg-[var(--signal-offline)]"
        : "bg-[var(--signal-unknown)]";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color} ${status === "online" ? "animate-pulse-soft" : ""}`}
      aria-hidden
    />
  );
}

export default function Dashboard() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [selectedCidr, setSelectedCidr] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [scanningUi, setScanningUi] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao obter status");
      const json = (await res.json()) as StatusResponse;
      startTransition(() => {
        setData(json);
        setSelectedCidr((prev) => prev || json.monitoredCidr || json.interfaces[0]?.cidr || "");
        setError(json.scan?.error ?? null);
        setScanningUi(Boolean(json.scan?.scanning));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de rede");
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    pollRef.current = setInterval(() => {
      void refresh();
    }, 3000);
    return () => {
      clearTimeout(initial);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  async function handleScan() {
    setError(null);
    setScanningUi(true);
    try {
      const iface = data?.interfaces.find((i) => i.cidr === selectedCidr);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cidr: selectedCidr || undefined,
          interfaceName: iface?.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha na varredura");
      }
      setData({
        interfaces: json.interfaces ?? data?.interfaces ?? [],
        scan: json.scan ?? null,
        monitoredCidr: json.monitoredCidr ?? selectedCidr,
      });
      // Keep polling; scan runs async on server
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na varredura");
      setScanningUi(false);
    }
  }

  const interfaces: NetworkInterfaceInfo[] = data?.interfaces ?? [];
  const devices = data?.scan?.devices ?? [];
  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const scanning = scanningUi || Boolean(data?.scan?.scanning);

  const filtered = devices.filter((d) => {
    if (filter === "online" && d.status !== "online") return false;
    if (filter === "offline" && d.status !== "offline") return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      d.ip.includes(q) ||
      (d.hostname?.toLowerCase().includes(q) ?? false) ||
      (d.mac?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 ambient-grid" aria-hidden />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(14,116,144,0.35),transparent_70%)] blur-2xl animate-drift" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.12),transparent_65%)] blur-xl" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8 sm:px-10">
        <p className="font-[family-name:var(--font-display)] text-sm tracking-[0.22em] text-[var(--mist)] uppercase">
          Projeto wii · michel silva
        </p>
        <p className="font-mono text-xs text-[var(--mist-dim)]">monitor local · CIDR privado</p>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-6 pb-20 pt-10 sm:px-10">
        {/* Hero — brand first, one composition */}
        <section className="hero-plane relative min-h-[min(72vh,36rem)] overflow-hidden rounded-none">
          <div className="absolute inset-0 hero-mesh" aria-hidden />
          <div className="relative flex min-h-[min(72vh,36rem)] flex-col justify-end gap-8 py-12 sm:py-16">
            <div className="animate-rise">
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(3.25rem,12vw,7.5rem)] leading-[0.9] tracking-tight text-[var(--foam)]">
                Wii Net
              </h1>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--teal-bright)] sm:text-2xl">
                Rede Watch
              </p>
            </div>
            <p className="max-w-xl animate-rise-delay text-base leading-relaxed text-[var(--mist)] sm:text-lg">
              Descubra e acompanhe dispositivos na sua LAN — IP, MAC, hostname e
              presença ao vivo. Roda na máquina que está na rede alvo.
            </p>
            <div className="flex flex-wrap items-center gap-3 animate-rise-delay-2">
              <button
                type="button"
                onClick={() => void handleScan()}
                disabled={scanning || !selectedCidr}
                className="group relative overflow-hidden bg-[var(--teal-bright)] px-7 py-3.5 font-[family-name:var(--font-display)] text-base font-semibold tracking-wide text-[var(--ink)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10">
                  {scanning ? "Varrendo a rede…" : "Iniciar varredura"}
                </span>
              </button>
              <label className="flex min-w-[14rem] flex-1 flex-col gap-1 sm:max-w-xs">
                <span className="text-xs uppercase tracking-wider text-[var(--mist-dim)]">
                  Rede (CIDR local)
                </span>
                <select
                  className="border border-[var(--line)] bg-[var(--panel)] px-3 py-3 font-mono text-sm text-[var(--foam)] outline-none focus:border-[var(--teal-bright)]"
                  value={selectedCidr}
                  onChange={(e) => setSelectedCidr(e.target.value)}
                  disabled={scanning}
                >
                  {interfaces.length === 0 && (
                    <option value="">Nenhuma interface privada</option>
                  )}
                  {interfaces.map((iface) => (
                    <option key={`${iface.name}-${iface.cidr}`} value={iface.cidr}>
                      {iface.name} · {iface.cidr} ({iface.address})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="mt-6 border-l-2 border-[var(--signal-offline)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--foam)]"
          >
            {error}
          </p>
        )}

        {/* Status strip — interaction surface, not hero cards */}
        <section className="mt-14 border-t border-[var(--line)] pt-8" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--foam)] sm:text-3xl">
                Dispositivos na rede
              </h2>
              <p className="mt-1 text-sm text-[var(--mist)]">
                {scanning
                  ? "Varredura ICMP + ARP em andamento…"
                  : data?.scan
                    ? `Última varredura: ${new Date(data.scan.finishedAt ?? data.scan.startedAt).toLocaleString("pt-BR")}`
                    : "Ainda sem varredura — inicie para descobrir hosts."}
                {isPending ? " · atualizando" : ""}
              </p>
            </div>
            <dl className="flex gap-8 font-mono text-sm">
              <div>
                <dt className="text-[var(--mist-dim)]">online</dt>
                <dd className="text-2xl text-[var(--signal-online)]">{online}</dd>
              </div>
              <div>
                <dt className="text-[var(--mist-dim)]">offline</dt>
                <dd className="text-2xl text-[var(--signal-offline)]">{offline}</dd>
              </div>
              <div>
                <dt className="text-[var(--mist-dim)]">total</dt>
                <dd className="text-2xl text-[var(--foam)]">{devices.length}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 border border-[var(--line)] p-1">
              {(["all", "online", "offline"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 text-sm transition ${
                    filter === key
                      ? "bg-[var(--foam)] text-[var(--ink)]"
                      : "text-[var(--mist)] hover:text-[var(--foam)]"
                  }`}
                >
                  {key === "all" ? "Todos" : key === "online" ? "Online" : "Offline"}
                </button>
              ))}
            </div>
            <input
              type="search"
              placeholder="Filtrar IP, hostname ou MAC…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-[12rem] flex-1 border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-[var(--foam)] placeholder:text-[var(--mist-dim)] outline-none focus:border-[var(--teal-bright)] sm:max-w-sm"
            />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wider text-[var(--mist-dim)]">
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">IP</th>
                  <th className="py-3 pr-4 font-medium">Hostname</th>
                  <th className="py-3 pr-4 font-medium">MAC</th>
                  <th className="py-3 font-medium">Visto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-[var(--mist)]">
                      {scanning
                        ? "Aguardando respostas da rede…"
                        : "Nenhum dispositivo nesta lista."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((device, i) => (
                    <tr
                      key={device.ip}
                      className="border-b border-[var(--line-soft)] transition hover:bg-[var(--row-hover)]"
                      style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                    >
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center gap-2 capitalize text-[var(--foam)]">
                          <StatusDot status={device.status} />
                          {device.status === "online" ? "online" : "offline"}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-[var(--teal-bright)]">
                        {device.ip}
                      </td>
                      <td className="py-3.5 pr-4 text-[var(--foam)]">
                        {device.hostname ?? <span className="text-[var(--mist-dim)]">—</span>}
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-[var(--mist)]">
                        {device.mac ?? "—"}
                      </td>
                      <td className="py-3.5 text-[var(--mist)]">
                        {formatRelative(device.lastSeen)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 max-w-2xl border-t border-[var(--line)] pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--foam)]">
            Como funciona
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--mist)]">
            O Wii Net lista interfaces IPv4 privadas desta máquina, varre o CIDR
            local com ping ICMP, lê a tabela ARP do Linux e resolve hostnames via
            DNS reverso. Apenas redes privadas (RFC1918), link-local e loopback
            são aceitas — sem varredura de redes externas.
          </p>
        </section>
      </main>
    </div>
  );
}
