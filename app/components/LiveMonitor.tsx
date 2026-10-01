"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Visit = {
  id: number;
  ip: string | null;
  localIp: string | null;
  userAgent: string | null;
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
  botName: string | null;
  screenSize: string | null;
  orientation: string | null;
  connectionType: string | null;
  battery: string | null;
  charging: string | null;
  gpu: string | null;
  incognito: string | null;
  adblocker: string | null;
  vpnProxy: string | null;
  tor: string | null;
  vm: string | null;
  source: string | null;
  createdAt: string;
};

type Props = {
  code: string;
  token: string;
  initialTotal: number;
  initialVisits: Visit[];
};

function cell(v: string | null | undefined) {
  return v && String(v).trim() ? v : "—";
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
  const [selected, setSelected] = useState<Visit | null>(
    initialVisits.length ? initialVisits[initialVisits.length - 1] : null,
  );
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
          setSelected(fresh[fresh.length - 1]);
          return [...prev, ...fresh];
        });
      } catch {
        // ignore
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
            Aguardando o primeiro clique no link ou pixel de imagem…
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>IP</th>
                  <th>Local</th>
                  <th>Device</th>
                  <th>Browser</th>
                  <th>VPN</th>
                  <th>Fonte</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((v) => (
                  <tr
                    key={v.id}
                    className={flashIds.has(v.id) ? "new-row" : undefined}
                    onClick={() => setSelected(v)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{v.createdAt.replace("T", " ")}</td>
                    <td>
                      <code>{cell(v.ip)}</code>
                    </td>
                    <td>
                      {[v.city, v.region, v.country]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td>{cell(v.device)}</td>
                    <td>{cell(v.browser)}</td>
                    <td>{cell(v.vpnProxy)}</td>
                    <td>{cell(v.source)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected ? (
        <div className="panel detail-grid">
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>
            Detalhe do clique #{selected.id}
          </h2>
          {(
            [
              ["Date/Time", selected.createdAt],
              ["IP Address", selected.ip],
              ["Local IP", selected.localIp],
              ["Country", selected.country],
              ["Region", selected.region],
              ["City", selected.city],
              ["ISP", selected.isp],
              ["Hostname", selected.hostname],
              ["Timezone", selected.timezone],
              ["Language", selected.language],
              ["Browser", selected.browser],
              ["Operating System", selected.os],
              ["Device", selected.device],
              ["Bot Name", selected.botName],
              ["Screen Size", selected.screenSize],
              ["Orientation", selected.orientation],
              ["Connection Type", selected.connectionType],
              ["Battery", selected.battery],
              ["Charging", selected.charging],
              ["GPU", selected.gpu],
              ["Incognito/Private", selected.incognito],
              ["Ad Blocker", selected.adblocker],
              ["VPN/Proxy", selected.vpnProxy],
              ["Tor", selected.tor],
              ["Virtual Machine", selected.vm],
              ["Referring URL", selected.referer],
              ["User Agent", selected.userAgent],
              ["Source", selected.source],
            ] as [string, string | null][]
          ).map(([k, val]) => (
            <div className="detail-row" key={k}>
              <span>{k}</span>
              <code>{cell(val)}</code>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
