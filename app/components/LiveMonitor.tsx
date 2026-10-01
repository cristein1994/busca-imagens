"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Visit = {
  id: number;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  isp: string | null;
  createdAt: string;
};

type Props = {
  code: string;
  token: string;
  initialTotal: number;
  initialVisits: Visit[];
};

function shortUa(ua: string | null) {
  if (!ua) return "—";
  if (ua.length <= 72) return ua;
  return `${ua.slice(0, 69)}…`;
}

export function LiveMonitor({
  code,
  token,
  initialTotal,
  initialVisits,
}: Props) {
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [total, setTotal] = useState(initialTotal);
  const [live, setLive] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const afterIdRef = useRef(
    initialVisits.length ? initialVisits[initialVisits.length - 1].id : 0,
  );

  useEffect(() => {
    const startAfter = afterIdRef.current;
    const url = `/api/links/${encodeURIComponent(code)}/stream?token=${encodeURIComponent(token)}&afterId=${startAfter}`;
    const es = new EventSource(url);
    setLive(true);

    es.addEventListener("visits", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          total: number;
          visits: Visit[];
        };
        setTotal(data.total);
        setVisits((prev) => {
          const known = new Set(prev.map((v) => v.id));
          const fresh = data.visits.filter((v) => !known.has(v.id));
          if (!fresh.length) return prev;
          afterIdRef.current = fresh[fresh.length - 1].id;
          setFlashIds(new Set(fresh.map((v) => v.id)));
          return [...prev, ...fresh];
        });
      } catch {
        // ignore bad payload
      }
    });

    es.addEventListener("ping", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as { total: number };
        setTotal(data.total);
      } catch {
        // ignore
      }
    });

    es.onerror = () => setLive(false);
    es.onopen = () => setLive(true);

    return () => {
      es.close();
      setLive(false);
    };
  }, [code, token]);

  useEffect(() => {
    if (!flashIds.size) return;
    const t = setTimeout(() => setFlashIds(new Set()), 1400);
    return () => clearTimeout(t);
  }, [flashIds]);

  const ordered = useMemo(
    () => [...visits].sort((a, b) => b.id - a.id),
    [visits],
  );

  return (
    <>
      <div className="meta-row">
        <div className="stat">
          {total}
          <small>cliques capturados</small>
        </div>
        <span className="status-live">
          <i />
          {live ? "online · ao vivo" : "reconectando…"}
        </span>
      </div>

      <div className="panel">
        {ordered.length === 0 ? (
          <div className="empty">
            Aguardando o primeiro clique no link de rastreio…
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quando (UTC)</th>
                  <th>IP</th>
                  <th>Local</th>
                  <th>ISP</th>
                  <th>Referer</th>
                  <th>User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((v) => (
                  <tr
                    key={v.id}
                    className={flashIds.has(v.id) ? "new-row" : undefined}
                  >
                    <td>{v.createdAt.replace("T", " ").replace("Z", "")}</td>
                    <td>
                      <code>{v.ip || "—"}</code>
                    </td>
                    <td>
                      {[v.city, v.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td>{v.isp || "—"}</td>
                    <td>{v.referer || "—"}</td>
                    <td title={v.userAgent || undefined}>{shortUa(v.userAgent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
