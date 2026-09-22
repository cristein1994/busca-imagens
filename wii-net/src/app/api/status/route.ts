import { NextResponse } from "next/server";
import { getMonitorSnapshot } from "@/lib/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getMonitorSnapshot());
}
