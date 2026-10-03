"""Chroma1-HD inference proxy via live Hugging Face Gradio Spaces.

This VM has no GPU / only ~5GB free RAM, so we cannot load the 8.9B weights
locally. Generation is forwarded to a public Space that hosts lodestones/Chroma1-HD.
"""

from __future__ import annotations

import base64
import io
import os
import tempfile
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

try:
    from gradio_client import Client
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Install server deps: pip install -r server/requirements.txt") from exc

from PIL import Image

APP_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = APP_ROOT / "chroma-out"
OUT_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_SPACES = [
    s.strip()
    for s in os.environ.get(
        "CHROMA_SPACES",
        "NikAgs/Chroma1-HD,fantasticstar/Chroma1-HD",
    ).split(",")
    if s.strip()
]

DEFAULT_NEGATIVE = (
    "low quality, ugly, unfinished, out of focus, deformed, disfigure, "
    "blurry, smudged, restricted palette, flat colors"
)

app = FastAPI(title="Chroma1-HD Runner", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_clients: dict[str, Client] = {}


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    negative_prompt: str = DEFAULT_NEGATIVE
    seed: int = Field(default=433, ge=0, le=2_147_483_647)
    width: int = Field(default=768, ge=256, le=1280)
    height: int = Field(default=768, ge=256, le=1280)
    guidance_scale: float = Field(default=3.0, ge=1.0, le=10.0)
    num_inference_steps: int = Field(default=28, ge=1, le=60)
    space: str | None = None


def _get_client(space: str) -> Client:
    if space not in _clients:
        _clients[space] = Client(space)
    return _clients[space]


def _snap_size(value: int) -> int:
    # Keep sizes Gradio dropdowns accept on community Spaces.
    choices = [512, 768, 1024, 1280]
    return min(choices, key=lambda c: abs(c - value))


def _to_image_bytes(result: Any) -> tuple[bytes, str]:
    path: str | None = None
    if isinstance(result, (list, tuple)):
        first = result[0]
        if isinstance(first, dict):
            path = first.get("path") or first.get("url")
        else:
            path = first
    elif isinstance(result, dict):
        path = result.get("path") or result.get("url")
    else:
        path = result

    if not path or not Path(str(path)).exists():
        raise RuntimeError(f"Space returned no image file: {result!r}")

    img = Image.open(path)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=92)
    return buf.getvalue(), "image/jpeg"


def _generate_on_space(space: str, req: GenerateRequest) -> tuple[bytes, str, float]:
    client = _get_client(space)
    t0 = time.time()
    w = _snap_size(req.width)
    h = _snap_size(req.height)

    # Prefer the multimodalart-style /generate endpoint used by NikAgs.
    try:
        result = client.predict(
            req.prompt,
            req.negative_prompt,
            float(req.seed),
            False,
            float(w),
            float(h),
            float(req.guidance_scale),
            float(req.num_inference_steps),
            api_name="/generate",
        )
    except Exception:
        # fantasticstar-style /generate_image
        result = client.predict(
            req.prompt,
            req.negative_prompt,
            float(min(req.num_inference_steps, 40)),
            float(req.guidance_scale),
            str(w),
            str(h),
            float(req.seed),
            api_name="/generate_image",
        )

    data, mime = _to_image_bytes(result)
    return data, mime, time.time() - t0


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "model": "lodestones/Chroma1-HD",
        "params": "8.9B",
        "license": "Apache-2.0",
        "base": "FLUX.1-schnell (heavily modified)",
        "spaces": DEFAULT_SPACES,
        "local_gpu": False,
        "note": "Inference via Hugging Face Gradio Spaces (no local GPU).",
    }


@app.get("/api/demo")
def demo_image() -> FileResponse:
    jpg = OUT_DIR / "chroma1-hd-demo.jpg"
    if not jpg.exists():
        raise HTTPException(404, "Demo image not generated yet")
    return FileResponse(jpg, media_type="image/jpeg")


@app.post("/api/generate")
def generate(req: GenerateRequest) -> dict[str, Any]:
    spaces = [req.space] if req.space else list(DEFAULT_SPACES)
    errors: list[str] = []

    for space in spaces:
        try:
            data, mime, elapsed = _generate_on_space(space, req)
            stamp = int(time.time())
            out_path = OUT_DIR / f"chroma-{stamp}-{req.seed}.jpg"
            out_path.write_bytes(data)
            b64 = base64.b64encode(data).decode("ascii")
            return {
                "ok": True,
                "model": "lodestones/Chroma1-HD",
                "space": space,
                "elapsed_sec": round(elapsed, 2),
                "seed": req.seed,
                "width": _snap_size(req.width),
                "height": _snap_size(req.height),
                "steps": req.num_inference_steps,
                "guidance_scale": req.guidance_scale,
                "mime": mime,
                "image_base64": b64,
                "saved_as": str(out_path.relative_to(APP_ROOT)),
            }
        except Exception as exc:  # noqa: BLE001 — surface all Space failures
            errors.append(f"{space}: {exc}")
            _clients.pop(space, None)

    raise HTTPException(
        status_code=502,
        detail={
            "message": "All Chroma Spaces failed",
            "errors": errors,
            "hint": "Spaces may be sleeping/paused. Retry, or set CHROMA_SPACES.",
        },
    )


@app.post("/api/warmup")
def warmup() -> dict[str, Any]:
    """Touch the first Space so cold starts finish before the user generates."""
    space = DEFAULT_SPACES[0]
    try:
        _get_client(space)
        return {"ok": True, "space": space}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8787")),
        reload=False,
    )
