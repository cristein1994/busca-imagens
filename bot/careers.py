from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

import requests

from bot.config import REQUEST_TIMEOUT, USER_AGENT

CAMINHOS_POSSIVEIS = [
    "/carreiras",
    "/trabalhe-conosco",
    "/trabalhe_conosco",
    "/careers",
    "/jobs",
    "/vagas",
    "/oportunidades",
    "/trabalheconosco",
]

KEYWORDS = ("vaga", "oportunidade", "trabalhe", "careers", "jobs", "carreira")

HREF_PADRAO = re.compile(
    r'href=["\']([^"\']*(?:carreiras|trabalhe|careers|jobs|vagas)[^"\']*)["\']',
    re.IGNORECASE,
)


def normalizar_site(site: str) -> str | None:
    if not site or not site.strip():
        return None
    site = site.strip()
    if not site.startswith(("http://", "https://")):
        site = "https://" + site
    parsed = urlparse(site)
    if not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def _headers() -> dict[str, str]:
    return {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}


def _parece_pagina_carreiras(html: str) -> bool:
    lower = html.lower()
    return any(k in lower for k in KEYWORDS)


def encontrar_url_carreiras(site: str) -> str | None:
    base = normalizar_site(site)
    if not base:
        return None

    for caminho in CAMINHOS_POSSIVEIS:
        url_teste = base + caminho
        try:
            r = requests.get(
                url_teste,
                headers=_headers(),
                timeout=min(REQUEST_TIMEOUT, 8),
                allow_redirects=True,
            )
            if r.status_code == 200 and _parece_pagina_carreiras(r.text):
                return r.url or url_teste
        except requests.RequestException:
            continue

    try:
        r = requests.get(
            base,
            headers=_headers(),
            timeout=min(REQUEST_TIMEOUT, 8),
            allow_redirects=True,
        )
        if r.status_code == 200:
            for m in HREF_PADRAO.findall(r.text):
                url_cand = urljoin(base, m)
                if url_cand.startswith("http"):
                    return url_cand
    except requests.RequestException:
        pass

    return None


def descobrir_site_por_nome(nome: str) -> str | None:
    """Tenta achar o site oficial a partir do nome (DuckDuckGo HTML)."""
    query = f"{nome} site oficial"
    url = "https://html.duckduckgo.com/html/"
    try:
        r = requests.post(
            url,
            data={"q": query},
            headers=_headers(),
            timeout=REQUEST_TIMEOUT,
        )
        if r.status_code != 200:
            return None
        links = re.findall(
            r'uddg=([^&"]+)|class="result__a"[^>]*href="([^"]+)"',
            r.text,
        )
        from urllib.parse import unquote

        for group in links:
            raw = group[0] or group[1]
            if not raw:
                continue
            cand = unquote(raw)
            if not cand.startswith("http"):
                continue
            host = urlparse(cand).netloc.lower()
            if any(
                x in host
                for x in (
                    "duckduckgo",
                    "wikipedia",
                    "facebook",
                    "linkedin",
                    "instagram",
                    "youtube",
                    "glassdoor",
                    "indeed",
                )
            ):
                continue
            return f"{urlparse(cand).scheme}://{urlparse(cand).netloc}"
    except requests.RequestException:
        return None
    return None
