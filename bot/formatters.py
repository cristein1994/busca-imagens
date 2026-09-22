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


def formatar_socio(s: dict, indice: int | None = None) -> str:
    prefix = f"{indice}. " if indice is not None else ""
    lines = [
        f"👤 {prefix}*{escape_md(s.get('nome') or 'Sem nome')}*",
        f"   Cargo: {escape_md(s.get('qualificacao') or 'Não informada')}",
    ]
    if s.get("documento"):
        lines.append(f"   Doc: `{escape_md(s['documento'])}`")
    if s.get("entrada"):
        lines.append(f"   Entrada: {escape_md(s['entrada'])}")
    if s.get("faixa_etaria"):
        lines.append(f"   Faixa etária: {escape_md(s['faixa_etaria'])}")
    if s.get("representante"):
        lines.append(f"   Rep. legal: {escape_md(s['representante'])}")
    return "\n".join(lines)


def formatar_lista_socios(socios: list[dict], *, max_por_msg: int = 15) -> list[str]:
    """Quebra a lista de sócios em mensagens Telegram (limite de tamanho)."""
    if not socios:
        return ["❌ Nenhum sócio/administrador informado no QSA."]

    blocos: list[str] = []
    header = f"👥 *Associados ao CNPJ* ({len(socios)} no QSA atual)\n"
    atual = header
    for i, s in enumerate(socios, start=1):
        trecho = formatar_socio(s, i) + "\n"
        if len(atual) + len(trecho) > 3500 or (
            i > 1 and (i - 1) % max_por_msg == 0
        ):
            blocos.append(atual.rstrip())
            atual = trecho
        else:
            atual += trecho
    if atual.strip():
        blocos.append(atual.rstrip())
    return blocos
