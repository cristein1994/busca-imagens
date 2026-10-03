import { NextResponse } from "next/server";
import { maxInstructions, maxSourceBytes } from "@/lib/lua-runtime";
import type { HealthResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const body: HealthResponse = {
    ok: true,
    name: "Wii Lua · Ateliê Lunar",
    runtime: "fengari",
    luaVersion: "5.3",
    maxInstructions: maxInstructions(),
    maxSourceBytes: maxSourceBytes(),
  };
  return NextResponse.json(body);
}
