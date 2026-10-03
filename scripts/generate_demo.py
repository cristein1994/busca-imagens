#!/usr/bin/env python3
"""One-shot Chroma1-HD demo generation (official sample prompt)."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server.main import GenerateRequest, OUT_DIR, _generate_on_space  # noqa: E402


def main() -> None:
    req = GenerateRequest(
        prompt=(
            "A high-fashion close-up portrait of a blonde woman in clear sunglasses. "
            "The image uses a bold teal and red color split for dramatic lighting. "
            "The background is a simple teal-green. The photo is sharp and well-composed."
        ),
        seed=433,
        width=768,
        height=768,
        guidance_scale=3.0,
        num_inference_steps=28,
    )
    data, _mime, elapsed = _generate_on_space("NikAgs/Chroma1-HD", req)
    out = OUT_DIR / "chroma1-hd-demo.jpg"
    out.write_bytes(data)
    artifacts = Path("/opt/cursor/artifacts")
    if artifacts.is_dir():
        shutil.copy(out, artifacts / "chroma1-hd-demo.jpg")
    print(f"OK {out} ({len(data)} bytes, {elapsed:.1f}s)")


if __name__ == "__main__":
    main()
