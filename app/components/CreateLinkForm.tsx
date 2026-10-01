"use client";

import { FormEvent, useState } from "react";

type Created = {
  code: string;
  token: string;
  targetUrl: string;
  label: string | null;
  trackUrl: string;
  dashboardUrl: string;
};

export function CreateLinkForm() {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar link");
      setCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <div className="panel">
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          URL de destino
          <input
            type="url"
            required
            placeholder="https://exemplo.com/pagina"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label>
          Nome do monitor (opcional)
          <input
            type="text"
            placeholder="Campanha WhatsApp"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
          />
        </label>
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Criando…" : "Criar link + dashboard"}
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>

      {created ? (
        <div style={{ marginTop: "1.25rem" }} className="form-grid">
          <div className="copy-box">
            <strong>Link para enviar</strong>
            <code>{created.trackUrl}</code>
            <div className="actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => copy(created.trackUrl)}
              >
                Copiar link
              </button>
            </div>
          </div>
          <div className="copy-box">
            <strong>Dashboard ao vivo (guarde este link)</strong>
            <code>{created.dashboardUrl}</code>
            <div className="actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => copy(created.dashboardUrl)}
              >
                Copiar dashboard
              </button>
              <a className="btn btn-primary" href={created.dashboardUrl}>
                Abrir monitor
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
