import type { CnpjCompany } from "./types";

const DEFAULT_BASE = "https://brasilapi.com.br/api";
const UA = "RAIZ-CNPJ/1.0 (+https://github.com/cristein1994/busca-imagens)";

async function getJson(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** Minha Receita returns a schema very close to BrasilAPI. */
async function fetchMinhaReceita(
  digits: string,
): Promise<
  | { ok: true; data: CnpjCompany }
  | { ok: false; error: string; status: number }
> {
  let res: Response;
  try {
    res = await getJson(`https://minhareceita.org/${digits}`);
  } catch {
    return {
      ok: false,
      error: "Falha de rede ao consultar Minha Receita.",
      status: 502,
    };
  }

  if (res.status === 404) {
    return { ok: false, error: "CNPJ não encontrado na base pública.", status: 404 };
  }
  if (!res.ok) {
    return {
      ok: false,
      error: `Minha Receita respondeu ${res.status}.`,
      status: res.status,
    };
  }

  const data = (await res.json()) as CnpjCompany;
  return { ok: true, data };
}

export async function fetchCnpj(
  digits: string,
  init?: RequestInit,
): Promise<
  | { ok: true; data: CnpjCompany }
  | { ok: false; error: string; status: number }
> {
  const base = process.env.BRASIL_API_BASE?.replace(/\/$/, "") || DEFAULT_BASE;
  const url = `${base}/cnpj/v1/${digits}`;

  let res: Response;
  try {
    res = await getJson(url, init);
  } catch {
    return fetchMinhaReceita(digits);
  }

  if (res.status === 404) {
    return { ok: false, error: "CNPJ não encontrado na base pública.", status: 404 };
  }

  // Vercel edge sometimes 403s bare/runtime clients — fall back.
  if (res.status === 403 || res.status === 429 || res.status >= 500) {
    const fallback = await fetchMinhaReceita(digits);
    if (fallback.ok) return fallback;
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `BrasilAPI respondeu ${res.status}. Tente novamente em instantes.`,
      status: res.status,
    };
  }

  const data = (await res.json()) as CnpjCompany;
  return { ok: true, data };
}
