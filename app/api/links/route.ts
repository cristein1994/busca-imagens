import { NextRequest, NextResponse } from "next/server";
import { createLink, listLinks } from "@/lib/db";
import { findLoggerImage, saveLoggerImage } from "@/lib/image-asset";
import { baseUrl, isValidHttpUrl, newCode, newToken } from "@/lib/utils";
import fs from "fs";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function linkPayload(code: string, token: string, targetUrl: string, label: string | null, smartLogger: boolean) {
  const hasPhoto = Boolean(findLoggerImage(code));
  return {
    code,
    token,
    targetUrl,
    label,
    smartLogger,
    hasPhoto,
    trackUrl: `${baseUrl()}/l/${code}`,
    imageUrl: `${baseUrl()}/i/${code}`,
    dashboardUrl: `${baseUrl()}/d/${code}?token=${token}`,
  };
}

export async function GET() {
  const links = listLinks().map((l) =>
    linkPayload(
      l.code,
      l.token,
      l.target_url,
      l.label,
      l.smart_logger === 1,
    ),
  );
  return NextResponse.json({ links });
}

async function parseBody(req: NextRequest): Promise<{
  url: string;
  label: string | null;
  smartLogger: boolean;
  imageTempPath?: string;
  imageExt?: string;
}> {
  const ctype = req.headers.get("content-type") || "";

  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    const url = String(form.get("url") || "").trim();
    const label = String(form.get("label") || "").trim() || null;
    const smartLogger = String(form.get("smartLogger") || "true") !== "false";
    const file = form.get("image");

    let imageTempPath: string | undefined;
    let imageExt: string | undefined;
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      const f = file as File;
      const buf = Buffer.from(await f.arrayBuffer());
      const name = f.name || "photo.jpg";
      imageExt = path.extname(name).toLowerCase() || ".jpg";
      imageTempPath = path.join(os.tmpdir(), `pulse-upload-${Date.now()}${imageExt}`);
      fs.writeFileSync(imageTempPath, buf);
    }

    return { url, label, smartLogger, imageTempPath, imageExt };
  }

  const body = (await req.json()) as {
    url?: string;
    label?: string;
    smartLogger?: boolean;
  };
  return {
    url: (body.url || "").trim(),
    label: (body.label || "").trim() || null,
    smartLogger: body.smartLogger !== false,
  };
}

export async function POST(req: NextRequest) {
  let parsed: Awaited<ReturnType<typeof parseBody>>;
  try {
    parsed = await parseBody(req);
  } catch {
    return NextResponse.json({ error: "JSON/form inválido" }, { status: 400 });
  }

  const { url, label, smartLogger, imageTempPath, imageExt } = parsed;

  if (!url || !isValidHttpUrl(url)) {
    if (imageTempPath) fs.unlinkSync(imageTempPath);
    return NextResponse.json(
      { error: "Informe uma URL http(s) válida" },
      { status: 400 },
    );
  }

  const code = newCode();
  const token = newToken();
  createLink({
    code,
    token,
    targetUrl: url,
    label: label ?? undefined,
    smartLogger,
  });

  if (imageTempPath) {
    try {
      saveLoggerImage(code, imageTempPath, imageExt || ".jpg");
    } finally {
      fs.unlinkSync(imageTempPath);
    }
  }

  return NextResponse.json(
    linkPayload(code, token, url, label, smartLogger),
  );
}
