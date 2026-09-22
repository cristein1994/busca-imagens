from __future__ import annotations

import re
from typing import Any

import requests

from bot.config import REQUEST_TIMEOUT, USER_AGENT


def _headers_json() -> dict[str, str]:
    return {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }


def buscar_vagas_gupy(subdominio: str) -> list[dict[str, Any]]:
    url = f"https://{subdominio}.gupy.io/api/v1/jobs"
    try:
        resp = requests.get(url, headers=_headers_json(), timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        return []
    if resp.status_code != 200:
        return []
    data = resp.json()
    jobs: list[dict[str, Any]] = []
    for j in data.get("jobs", []):
        jobs.append(
            {
                "titulo": j.get("title"),
                "local": j.get("locationName") or j.get("workplaceType"),
                "link": j.get("jobUrl")
                or f"https://{subdominio}.gupy.io/job/{j.get('id', '')}",
                "fonte": "gupy",
            }
        )
    return jobs


def buscar_vagas_greenhouse(board_token: str) -> list[dict[str, Any]]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs"
    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        return []
    if resp.status_code != 200:
        return []
    data = resp.json()
    jobs: list[dict[str, Any]] = []
    for j in data.get("jobs", []):
        loc = j.get("location") or {}
        deps = j.get("departments") or []
        dep = deps[0] if deps else {}
        jobs.append(
            {
                "titulo": j.get("title"),
                "local": loc.get("name"),
                "departamento": dep.get("name"),
                "link": j.get("absolute_url"),
                "fonte": "greenhouse",
            }
        )
    return jobs


def buscar_vagas_lever(company: str) -> list[dict[str, Any]]:
    url = f"https://api.lever.co/v0/postings/{company}?mode=json"
    try:
        resp = requests.get(url, headers=_headers_json(), timeout=REQUEST_TIMEOUT)
    except requests.RequestException:
        return []
    if resp.status_code != 200:
        return []
    data = resp.json()
    if not isinstance(data, list):
        return []
    jobs: list[dict[str, Any]] = []
    for j in data:
        cats = j.get("categories") or {}
        jobs.append(
            {
                "titulo": j.get("text"),
                "local": cats.get("location"),
                "departamento": cats.get("team") or cats.get("department"),
                "link": j.get("hostedUrl") or j.get("applyUrl"),
                "fonte": "lever",
            }
        )
    return jobs


def buscar_vagas_por_url(url_carreiras: str) -> list[dict[str, Any]]:
    url = (url_carreiras or "").lower()

    if "gupy.io" in url or ".gupy." in url:
        match = re.search(r"https?://([^.]+)\.gupy\.io", url_carreiras, re.I)
        if match:
            return buscar_vagas_gupy(match.group(1))

    if "greenhouse" in url:
        match = re.search(
            r"boards\.greenhouse\.io/([a-zA-Z0-9_-]+)", url_carreiras, re.I
        )
        if match:
            return buscar_vagas_greenhouse(match.group(1))

    if "lever.co" in url:
        match = re.search(r"jobs\.lever\.co/([a-zA-Z0-9_-]+)", url_carreiras, re.I)
        if match:
            return buscar_vagas_lever(match.group(1))

    # Página intermediária: tenta achar links para ATS no HTML
    try:
        resp = requests.get(
            url_carreiras,
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True,
        )
        if resp.status_code == 200:
            html = resp.text
            gupy = re.search(r"https?://([^.]+)\.gupy\.io", html, re.I)
            if gupy:
                return buscar_vagas_gupy(gupy.group(1))
            gh = re.search(
                r"boards\.greenhouse\.io/([a-zA-Z0-9_-]+)", html, re.I
            )
            if gh:
                return buscar_vagas_greenhouse(gh.group(1))
            lever = re.search(r"jobs\.lever\.co/([a-zA-Z0-9_-]+)", html, re.I)
            if lever:
                return buscar_vagas_lever(lever.group(1))
    except requests.RequestException:
        pass

    return []
