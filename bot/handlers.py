from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

from bot.careers import descobrir_site_por_nome, encontrar_url_carreiras
from bot.cnpj import consultar_cnpj, extrair_site, limpar_cnpj, validar_cnpj
from bot.formatters import escape_md, formatar_vaga
from bot.jobs import buscar_vagas_por_url

MAX_VAGAS = 20


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    await update.message.reply_text(
        "Olá! Envie:\n"
        "/cnpj 12345678000199\n"
        "ou\n"
        "/nome Nome da Empresa\n"
        "ou\n"
        "/site empresa.com.br\n\n"
        "Exemplo: /cnpj 00000000000191\n"
        "Sistemas: Gupy, Greenhouse e Lever."
    )


async def _responder_vagas(
    update: Update,
    *,
    razao: str,
    site: str,
) -> None:
    assert update.message
    msg = f"🏢 *Empresa:* {escape_md(razao)}\n"
    msg += f"🌐 *Site:* {escape_md(site) if site else 'Não informado'}"
    await update.message.reply_text(msg, parse_mode="Markdown")

    if not site:
        await update.message.reply_text(
            "❌ Sem site na base. Tente /site dominio.com.br"
        )
        return

    url_carreiras = encontrar_url_carreiras(site)
    if not url_carreiras:
        await update.message.reply_text("❌ Não encontrei página de carreiras.")
        return

    await update.message.reply_text(f"🔗 Página de carreiras: {url_carreiras}")

    vagas = buscar_vagas_por_url(url_carreiras)
    if not vagas:
        await update.message.reply_text(
            "⚠️ Nenhuma vaga encontrada ou ATS não suportado "
            "(Gupy / Greenhouse / Lever)."
        )
        return

    total = len(vagas)
    mostrar = vagas[:MAX_VAGAS]
    await update.message.reply_text(f"✅ {total} vaga(s). Mostrando até {MAX_VAGAS}:")
    for v in mostrar:
        await update.message.reply_text(formatar_vaga(v), parse_mode="Markdown")


async def buscar_por_cnpj(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    if not context.args:
        await update.message.reply_text("Uso: /cnpj 12345678000199")
        return

    cnpj = context.args[0]
    limpo = limpar_cnpj(cnpj)
    if len(limpo) != 14:
        await update.message.reply_text("❌ CNPJ inválido (precisa de 14 dígitos).")
        return
    if not validar_cnpj(limpo):
        await update.message.reply_text(
            "⚠️ Dígitos verificadores do CNPJ parecem inválidos. Continuando mesmo assim…"
        )

    await update.message.reply_text(f"🔍 Buscando vagas para CNPJ {limpo}...")

    try:
        dados = consultar_cnpj(limpo)
        razao = dados.get("razao_social") or dados.get("nome_fantasia") or "Desconhecido"
        site = extrair_site(dados)
        await _responder_vagas(update, razao=razao, site=site)
    except Exception as e:
        await update.message.reply_text(f"❌ Erro: {e}")


async def buscar_por_nome(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    if not context.args:
        await update.message.reply_text("Uso: /nome Nome da Empresa")
        return

    nome = " ".join(context.args).strip()
    await update.message.reply_text(
        f"🔍 Buscando site oficial de '{nome}'..."
    )

    try:
        site = descobrir_site_por_nome(nome)
        if not site:
            await update.message.reply_text(
                "❌ Não achei o site. Use /cnpj ou /site dominio.com.br"
            )
            return
        await _responder_vagas(update, razao=nome, site=site)
    except Exception as e:
        await update.message.reply_text(f"❌ Erro: {e}")


async def buscar_por_site(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    if not context.args:
        await update.message.reply_text("Uso: /site empresa.com.br")
        return

    site = context.args[0].strip()
    await update.message.reply_text(f"🔍 Buscando vagas em {site}...")
    try:
        await _responder_vagas(update, razao=site, site=site)
    except Exception as e:
        await update.message.reply_text(f"❌ Erro: {e}")
