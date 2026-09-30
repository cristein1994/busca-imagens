import type { CnpjCompany } from "./types";

const DEFAULT_BASE = "https://brasilapi.com.br/api";

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
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      next: { revalidate: 3600 },
    });
  } catch {
    return {
      ok: false,
      error: "Falha de rede ao consultar a BrasilAPI.",
      status: 502,
    };
  }

  if (res.status === 404) {
    return { ok: false, error: "CNPJ não encontrado na base pública.", status: 404 };
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
