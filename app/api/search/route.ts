import { NextResponse } from "next/server";
import { z } from "zod";
import { runSurfaceSearch } from "@/lib/surface-search";
import type { SearchSource } from "@/lib/types";

const bodySchema = z.object({
  query: z.string().min(1).max(200),
  sources: z
    .array(z.enum(["wikipedia", "duckduckgo", "openlibrary", "local"]))
    .optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const sources = (parsed.data.sources?.filter((s) => s !== "local") ?? [
      "wikipedia",
      "duckduckgo",
      "openlibrary",
    ]) as SearchSource[];

    const { results, errors } = await runSurfaceSearch(parsed.data.query, sources);
    return NextResponse.json({
      query: parsed.data.query,
      count: results.length,
      results,
      errors,
      scope: "surface-web-public-only",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha na busca pública",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
