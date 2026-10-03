import { NextResponse } from "next/server";
import { runLua } from "@/lib/lua-runtime";
import type { RunRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: RunRequest;
  try {
    body = (await request.json()) as RunRequest;
  } catch {
    return NextResponse.json(
      {
        status: "invalid",
        stdout: [],
        returns: [],
        error: "JSON inválido. Envie { \"source\": \"...\" }.",
        line: null,
        elapsedMs: 0,
        instructionCount: 0,
        runtime: "fengari",
        luaVersion: "5.3",
      },
      { status: 400 },
    );
  }

  const result = runLua(typeof body.source === "string" ? body.source : "");
  const http =
    result.status === "invalid" ? 400 : result.status === "timeout" ? 408 : 200;
  return NextResponse.json(result, { status: http });
}
