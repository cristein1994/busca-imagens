"use client";

import { FormEvent, useState } from "react";
import { SiteNav } from "@/app/components/SiteNav";

type Result = {
  ip: string;
  country: string | null;
  city: string | null;
  region: string | null;
  isp: string | null;
  hostname: string | null;
  timezone: string | null;
  vpnProxy: string | null;
  tor: string | null;
  hosting: string | null;
};

export default function IpLookupPage() {
  const [ip, setIp] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tools/ip?ip=${encodeURIComponent(ip)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha");
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <div className="brand">
        <strong>PULSE</strong>
        <span>ip lookup</span>
      </div>
      <SiteNav />
      <div className="panel">
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Endereço IP
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="8.8.8.8"
              required
            />
          </label>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Consultando…" : "Consultar"}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        {data ? (
          <div className="detail-grid" style={{ marginTop: "1rem" }}>
            {Object.entries(data).map(([k, v]) => (
              <div className="detail-row" key={k}>
                <span>{k}</span>
                <code>{v ?? "—"}</code>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
