import { NextResponse } from "next/server";
import { getLlmConfig, getTorConfig } from "@/lib/config";
import { probeLlm } from "@/lib/llm";
import { checkTor } from "@/lib/tor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [tor, llm] = await Promise.all([checkTor(), probeLlm()]);
  return NextResponse.json({
    tor: { ...tor, ...getTorConfig() },
    llm: { ...llm, config: getLlmConfig() },
    time: new Date().toISOString(),
  });
}
