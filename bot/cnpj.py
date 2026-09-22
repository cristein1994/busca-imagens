from __future__ import annotations

import re

import requests

from bot.config import REQUEST_TIMEOUT, USER_AGENT


def limpar_cnpj(cnpj: str) -> str:
    return re.sub(r"\D", "", cnpj)


def validar_cnpj(cnpj: str) -> bool:
    digits = limpar_cnpj(cnpj)
    if len(digits) != 14 or digits == digits[0] * 14:
        return False

    def _digito(base: str, pesos: list[int]) -> str:
        soma = sum(int(d) * p for d, p in zip(base, pesos))
        resto = soma % 11
        return "0" if resto < 2 else str(11 - resto)

    d1 = _digito(digits[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    d2 = _digito(digits[:12] + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return digits.endswith(d1 + d2)


def consultar_cnpj(cnpj: str) -> dict:
    """Consulta dados da empresa na BrasilAPI."""
    cnpj_limpo = limpar_cnpj(cnpj)
    if len(cnpj_limpo) != 14:
        raise ValueError("CNPJ deve ter 14 dígitos.")

    url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}"
    resp = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=REQUEST_TIMEOUT,
    )
    if resp.status_code == 404:
        raise ValueError("CNPJ não encontrado na BrasilAPI.")
    resp.raise_for_status()
    return resp.json()


def extrair_site(dados: dict) -> str:
    """BrasilAPI não sempre traz 'site'; tenta campos comuns e e-mail de domínio."""
    for key in ("site", "website", "url", "pagina_web"):
        val = dados.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()

    email = dados.get("email") or ""
    if isinstance(email, str) and "@" in email:
        dominio = email.split("@", 1)[1].lower().strip()
        if dominio and "." in dominio and not dominio.endswith(
            ("gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com")
        ):
            return f"https://{dominio}"

    return ""
