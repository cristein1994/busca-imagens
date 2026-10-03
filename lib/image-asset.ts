import fs from "fs";
import path from "path";

const EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function imagesDir() {
  return path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "images");
}

export function ensureImagesDir() {
  const dir = imagesDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function findLoggerImage(code: string): { path: string; mime: string } | null {
  const dir = ensureImagesDir();
  for (const ext of EXTS) {
    const p = path.join(dir, `${code}${ext}`);
    if (fs.existsSync(p)) return { path: p, mime: MIME[ext] };
  }
  return null;
}

export function saveLoggerImage(
  code: string,
  sourcePath: string,
  ext = ".jpg",
): string {
  const dir = ensureImagesDir();
  const safeExt = EXTS.includes(ext as (typeof EXTS)[number]) ? ext : ".jpg";
  const dest = path.join(dir, `${code}${safeExt}`);
  fs.copyFileSync(sourcePath, dest);
  return dest;
}
