"use client";

import { FormEvent, useState } from "react";
import { SiteNav } from "@/app/components/SiteNav";

type ExpandResult = {
  input: string;
  final: string;
  hops: { url: string; status: number | null }[];
};

export default function ExpandPage() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<ExpandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tools/expand?url=${encodeURIComponent(url)}`,
      );
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
        <span>url expander</span>
      </div>
      <SiteNav />
      <div className="panel">
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            URL encurtada
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://bit.ly/..."
              required
            />
          </label>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Expandindo…" : "Expandir"}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        {data ? (
          <div style={{ marginTop: "1rem" }} className="form-grid">
            <div className="copy-box">
              <strong>Destino final</strong>
              <code>{data.final}</code>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Status</th>
                    <th>URL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hops.map((h, i) => (
                    <tr key={`${h.url}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{h.status ?? "erro"}</td>
                      <td>
                        <code>{h.url}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
