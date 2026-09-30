import { NextResponse } from "next/server";
import { fetchCnpj } from "@/lib/brasilapi";
import { isValidCnpj, onlyDigits } from "@/lib/cnpj";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cnpj: string }> },
) {
  const { cnpj: raw } = await context.params;
  const digits = onlyDigits(raw);

  if (!isValidCnpj(digits)) {
    return NextResponse.json(
      { ok: false, error: "CNPJ inválido. Confira os dígitos verificadores." },
      { status: 400 },
    );
  }

  const result = await fetchCnpj(digits);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}
