import { customAlphabet } from "nanoid";

const codeAlphabet = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  8,
);

const tokenAlphabet = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  24,
);

export function newCode() {
  return codeAlphabet();
}

export function newToken() {
  return tokenAlphabet();
}

export function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    null
  );
}

export function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export const GRABIFY_FEATURES = [
  { title: "Date/Time", body: "Horário UTC do clique", smart: false },
  { title: "IP Address", body: "IP público do visitante", smart: false },
  { title: "Country / City / Region", body: "Geo aproximada via IP", smart: false },
  { title: "ISP / Hostname", body: "Provedor e reverse DNS", smart: false },
  { title: "Browser / OS / Device", body: "Parse do User-Agent", smart: false },
  { title: "Bot Name", body: "Detecta previews e crawlers", smart: false },
  { title: "User Agent", body: "UA completo", smart: false },
  { title: "Referring URL", body: "De onde veio o clique", smart: false },
  { title: "VPN/Proxy Detection", body: "Sinal de proxy/VPN", smart: false },
  { title: "Tor Detection", body: "Heurística de exit Tor", smart: false },
  { title: "Language", body: "Idioma do navegador", smart: true },
  { title: "Timezone", body: "Fuso do dispositivo", smart: true },
  { title: "Screen Size", body: "Resolução da tela", smart: true },
  { title: "Orientation", body: "Portrait/landscape", smart: true },
  { title: "Connection Type", body: "4g/wifi/etc quando disponível", smart: true },
  { title: "Battery / Charging", body: "Nível e se está carregando", smart: true },
  { title: "GPU", body: "Renderer WebGL", smart: true },
  { title: "Incognito/Private", body: "Heurística de janela privada", smart: true },
  { title: "Ad Blocker", body: "Heurística de bloqueador", smart: true },
  { title: "Local IP", body: "IP local via WebRTC (se permitido)", smart: true },
  { title: "Virtual Machine", body: "Heurística de VM/headless", smart: true },
  { title: "Image Logger", body: "Pixel/imagem que registra ao carregar", smart: false },
] as const;
