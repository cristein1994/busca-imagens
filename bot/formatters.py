from __future__ import annotations

import re


def escape_md(text: str | None) -> str:
    """Escapa caracteres especiais do Markdown legado do Telegram."""
    if text is None:
        return ""
    return re.sub(r"([_*`\[\]])", r"\\\1", str(text))


def formatar_vaga(v: dict) -> str:
    titulo = escape_md(v.get("titulo") or "Sem título")
    local = escape_md(v.get("local") or "Local não informado")
    link = v.get("link") or ""
    lines = [f"💼 *{titulo}*", f"📍 {local}"]
    if v.get("departamento"):
        lines.append(f"🏷 {escape_md(v['departamento'])}")
    if link:
        lines.append(f"🔗 {link}")
    return "\n".join(lines)
