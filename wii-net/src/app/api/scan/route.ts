import { NextResponse } from "next/server";
import { listLocalInterfaces, parseCidr, pickDefaultCidr } from "@/lib/network";
import { getMonitorSnapshot, isScanning, startScan } from "@/lib/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScanBody {
  cidr?: string;
  interfaceName?: string;
}

export async function POST(request: Request) {
  if (isScanning()) {
    return NextResponse.json(
      { error: "Já existe uma varredura em andamento.", ...getMonitorSnapshot() },
      { status: 409 },
    );
  }

  let body: ScanBody = {};
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    body = {};
  }

  const interfaces = listLocalInterfaces();
  let cidr = body.cidr?.trim() || pickDefaultCidr(interfaces);
  let interfaceName = body.interfaceName ?? null;

  if (!cidr) {
    return NextResponse.json(
      {
        error:
          "Nenhuma interface IPv4 privada encontrada. Execute o Wii Net na máquina que está na rede local alvo.",
      },
      { status: 400 },
    );
  }

  try {
    parseCidr(cidr);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "CIDR inválido" },
      { status: 400 },
    );
  }

  if (!interfaceName) {
    interfaceName = interfaces.find((i) => i.cidr === cidr)?.name ?? null;
  }

  // If a specific interface was requested, prefer its CIDR when body.cidr omitted
  if (body.interfaceName && !body.cidr) {
    const iface = interfaces.find((i) => i.name === body.interfaceName);
    if (iface) {
      cidr = iface.cidr;
      interfaceName = iface.name;
    }
  }

  try {
    await startScan(cidr, interfaceName);
    return NextResponse.json({ ok: true, ...getMonitorSnapshot() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao iniciar varredura" },
      { status: 500 },
    );
  }
}
