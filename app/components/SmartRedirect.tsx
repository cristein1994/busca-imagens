"use client";

import { useEffect, useState } from "react";

type Props = {
  code: string;
  targetUrl: string;
  smartLogger: boolean;
};

type SmartPayload = {
  language?: string;
  timezone?: string;
  screenSize?: string;
  orientation?: string;
  connectionType?: string;
  battery?: string;
  charging?: string;
  gpu?: string;
  incognito?: string;
  adblocker?: string;
  localIp?: string;
  vm?: string;
  source: string;
};

async function detectIncognito(): Promise<string> {
  try {
    // Storage quota heuristic — private windows often have lower quota
    if (navigator.storage?.estimate) {
      const { quota } = await navigator.storage.estimate();
      if (quota && quota < 1200000000) return "likely";
    }
  } catch {
    // ignore
  }
  return "unknown";
}

async function detectAdblock(): Promise<string> {
  try {
    const el = document.createElement("div");
    el.className = "adsbox ad-banner adsbygoogle";
    el.style.cssText =
      "position:absolute;left:-9999px;height:10px;width:10px;";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 40));
    const blocked = el.offsetHeight === 0;
    el.remove();
    return blocked ? "yes" : "no";
  } catch {
    return "unknown";
  }
}

function detectGpu(): string | undefined {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return undefined;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return undefined;
    return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
  } catch {
    return undefined;
  }
}

async function detectBattery(): Promise<{
  battery?: string;
  charging?: string;
}> {
  try {
    // @ts-expect-error Battery API is not in all TS libs
    const batt = await navigator.getBattery?.();
    if (!batt) return {};
    return {
      battery: `${Math.round(batt.level * 100)}%`,
      charging: batt.charging ? "yes" : "no",
    };
  } catch {
    return {};
  }
}

function detectLocalIp(): Promise<string | undefined> {
  return new Promise((resolve) => {
    try {
      const RTCPeerConnection =
        window.RTCPeerConnection ||
        // @ts-expect-error vendor prefix
        window.webkitRTCPeerConnection ||
        // @ts-expect-error vendor prefix
        window.mozRTCPeerConnection;
      if (!RTCPeerConnection) {
        resolve(undefined);
        return;
      }
      const pc = new RTCPeerConnection({ iceServers: [] });
      const ips = new Set<string>();
      pc.createDataChannel("");
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close();
          resolve([...ips][0]);
          return;
        }
        const m = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
        if (m?.[1] && !m[1].startsWith("0.")) ips.add(m[1]);
      };
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .catch(() => resolve(undefined));
      setTimeout(() => {
        try {
          pc.close();
        } catch {
          // ignore
        }
        resolve([...ips][0]);
      }, 900);
    } catch {
      resolve(undefined);
    }
  });
}

function detectVm(gpu?: string): string {
  const g = (gpu || "").toLowerCase();
  if (
    g.includes("vmware") ||
    g.includes("virtualbox") ||
    g.includes("llvmpipe") ||
    g.includes("swiftshader")
  ) {
    return "likely";
  }
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) {
    return "likely";
  }
  return "no";
}

async function collectSmart(): Promise<SmartPayload> {
  const conn = (navigator as Navigator & {
    connection?: { effectiveType?: string };
  }).connection;

  const batt = await detectBattery();
  const gpu = detectGpu();
  const [incognito, adblocker, localIp] = await Promise.all([
    detectIncognito(),
    detectAdblock(),
    detectLocalIp(),
  ]);

  return {
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    orientation:
      window.screen.orientation?.type ||
      (window.innerWidth > window.innerHeight ? "landscape" : "portrait"),
    connectionType: conn?.effectiveType,
    battery: batt.battery,
    charging: batt.charging,
    gpu,
    incognito,
    adblocker,
    localIp,
    vm: detectVm(gpu),
    source: "smart-link",
  };
}

export function SmartRedirect({ code, targetUrl, smartLogger }: Props) {
  const [status, setStatus] = useState("Registrando acesso…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload: SmartPayload = smartLogger
          ? await collectSmart()
          : { source: "fast-link" };

        if (cancelled) return;
        setStatus("Redirecionando…");

        await fetch(`/api/links/${encodeURIComponent(code)}/hit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch {
        // still redirect
      } finally {
        if (!cancelled) window.location.replace(targetUrl);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, targetUrl, smartLogger]);

  return (
    <main className="shell" style={{ maxWidth: 520 }}>
      <div className="brand">
        <strong>PULSE</strong>
        <span>redirect</span>
      </div>
      <div className="panel">
        <p style={{ margin: 0 }}>{status}</p>
        <p className="hint">
          Se não redirecionar,{" "}
          <a href={targetUrl}>clique aqui</a>.
        </p>
      </div>
    </main>
  );
}
