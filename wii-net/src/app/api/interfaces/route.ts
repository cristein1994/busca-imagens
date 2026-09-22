import { NextResponse } from "next/server";
import { listLocalInterfaces } from "@/lib/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const interfaces = listLocalInterfaces();
  return NextResponse.json({ interfaces });
}
