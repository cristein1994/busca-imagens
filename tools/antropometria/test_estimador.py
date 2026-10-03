"""Smoke tests do estimador antropométrico."""

from __future__ import annotations

import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from tools.antropometria.estimador import estimar, glossario, main  # noqa: E402


def test_prior_sem_preditores() -> None:
    r = estimar()
    assert r["ereto_cm"] == 13.1
    assert r["circunferencia_ereta_cm"] == 11.7
    assert r["ajuste_comprimento_cm"] == 0.0
    assert r["preditores_usados"] == []
    assert "prior_populacional" in r["o_que_cada_termo_faz"]


def test_nariz_ajusta_comprimento() -> None:
    r = estimar(nariz_cm=5.2)  # +0.6 cm vs ref 4.6 → +0.36 comp
    assert r["ereto_cm"] == 13.5
    assert abs(r["ajuste_comprimento_cm"] - 0.36) < 1e-9
    assert "nariz_cm" in r["preditores_usados"]
    assert len(r["contribuicoes"]) == 1


def test_combo_e_rejeicoes() -> None:
    r = estimar(
        nariz_cm=5.2,
        altura_cm=180,
        imc=22,
        foto_rosto=" Ignorado ",
        cor_pele="#000",
        cor_glande="rosa",
    )
    assert r["entradas_rejeitadas"]
    assert any("foto" in x for x in r["entradas_rejeitadas"])
    assert r["diametro_eret_cm"] == round(r["circunferencia_ereta_cm"] / math.pi, 2)
    assert "z_scores" in r and "percentis_aprox" in r
    assert r["volume_cilindrico_eret_ml"] > 0


def test_glossario() -> None:
    g = glossario("nariz_cm")
    assert "efeito" in g
    assert "nariz_cm" in glossario()


def test_cli_prior() -> None:
    assert main([]) == 0
    assert main(["--json"]) == 0
    assert main(["--glossario", "imc"]) == 0


if __name__ == "__main__":
    test_prior_sem_preditores()
    test_nariz_ajusta_comprimento()
    test_combo_e_rejeicoes()
    test_glossario()
    test_cli_prior()
    print("ok")
