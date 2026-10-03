"""Estimativa antropométrica grosseira de dimensões penianas (versão estendida).

Fontes usadas só como prior + ajuste fraco:
- Veale et al. 2015, BJU Int: ereto 13,12 cm (DP ~1,66),
  circunferência ereta 11,66 cm (DP ~1,10), flácido 9,16 cm.
- Ikegaya et al. 2021, Basic Clin Androl: nariz × comprimento
  esticado, r = 0,564 em 126 cadáveres japoneses. Sem efeito claro
  na circunferência.
- Estudo coreano 2023, Transl Androl Urol, n = 1160: nariz prediz
  comprimento esticado (beta ~0,12); IMC prediz no sentido inverso;
  circunferência depende mais de peso e volume testicular.
Altura: associação fraca, clinicamente quase inútil.
2D:4D: sinal de andrógeno pré-natal, efeito pequeno.
Cor de pele, foto de rosto e cor da glande não entram.
"""

from __future__ import annotations

import argparse
import json
import math
from typing import Any

MEDIA = {
    "ereto_cm": 13.12,
    "circunferencia_ereta_cm": 11.66,
    "flacido_cm": 9.16,
    "circunferencia_flacida_cm": 9.31,
}
DP = {
    "ereto_cm": 1.66,
    "circunferencia_ereta_cm": 1.10,
    "flacido_cm": 1.57,
    "circunferencia_flacida_cm": 0.90,
}

# Coeficientes lineares (ajuste fraco de propósito).
COEF = {
    "nariz_comp": 0.60,  # cm SPL por cm de nariz (acima da ref)
    "nariz_circ": 0.15,  # efeito fraco na circunferência
    "altura_comp": 0.03,  # ~0,3 cm a cada 10 cm de altura
    "imc_comp": -0.08,  # beta negativo (coreano 2023)
    "imc_circ": 0.04,  # peso/IMC sobem um pouco a circunferência
    "d2d4d_comp": 1.5,  # aplicado a (ref - razão); 0,05 ≈ 0,075 cm
    "testiculo_circ": 0.04,  # ml → circunferência, não comprimento
    "flacido_comp_frac": 0.45,  # flácido acompanha menos o ajuste de comprimento
    "flacido_circ_frac": 0.70,  # circunferência flácida acompanha ~70% do ajuste erect
}

REFS = {
    "nariz_ref_cm": 4.6,
    "altura_ref_cm": 175.0,
    "imc_ref": 23.0,
    "razao_2d4d_ref": 0.96,
    "testiculo_ref_ml": 18.0,
}

FONTES = [
    {
        "id": "veale_2015",
        "cita": "Veale et al. 2015, BJU International",
        "uso": "priors populacionais (média + DP) de comprimento e circunferência",
    },
    {
        "id": "ikegaya_2021",
        "cita": "Ikegaya et al. 2021, Basic and Clinical Andrology",
        "uso": "correlação nariz × comprimento esticado (r≈0,564); circ. fraca/nula",
    },
    {
        "id": "korea_2023",
        "cita": "Translational Andrology and Urology 2023 (n=1160, Coreia)",
        "uso": "nariz prediz SPL (beta fraco); IMC inverso no comprimento; "
        "circunferência ligada a peso e volume testicular",
    },
]

# O que cada termo faz (glossário operacional).
GLOSSARIO_TERMOS: dict[str, dict[str, str]] = {
    "prior_populacional": {
        "o_que_e": "Média e DP da meta-análise Veale 2015, usados quando não há preditores.",
        "efeito": "Sem ajustes: ereto≈13,1 cm, circ. ereta≈11,7 cm, flácido≈9,2 cm.",
        "limite": "Descreve a população, não um indivíduo.",
    },
    "nariz_cm": {
        "o_que_e": "Comprimento nasal externo medido (não inferido de foto).",
        "efeito": f"+{COEF['nariz_comp']} cm no comprimento e +{COEF['nariz_circ']} cm "
        "na circunferência por cada cm acima da ref "
        f"({REFS['nariz_ref_cm']} cm). Melhor preditor publicado, r²≈0,3.",
        "limite": "Foto de rosto não mede nariz; amostra Ikegaya é cadavérica japonesa.",
    },
    "altura_cm": {
        "o_que_e": "Estatura em centímetros.",
        "efeito": f"+{COEF['altura_comp']} cm de comprimento por cm acima de "
        f"{REFS['altura_ref_cm']:.0f} cm (~0,3 cm a cada 10 cm).",
        "limite": "Associação fraca; clinicamente quase inútil sozinha.",
    },
    "imc": {
        "o_que_e": "Índice de massa corporal (kg/m²).",
        "efeito": f"{COEF['imc_comp']} cm no comprimento e +{COEF['imc_circ']} cm "
        f"na circunferência por unidade acima de {REFS['imc_ref']}.",
        "limite": "IMC alto pode mascarar comprimento aparente (gordura púbica), "
        "não necessariamente o comprimento ósseo/tecidual.",
    },
    "razao_2d4d": {
        "o_que_e": "Razão do dedo indicador (2D) pelo anelar (4D) da mão.",
        "efeito": "Razão menor (anelar relativamente longo, sinal androgênico pré-natal) "
        f"aumenta um pouco o comprimento: coef {COEF['d2d4d_comp']} × "
        f"(ref {REFS['razao_2d4d_ref']} − razão).",
        "limite": "Efeito pequeno e ruidoso; não use como diagnóstico.",
    },
    "volume_testicular_ml": {
        "o_que_e": "Volume testicular estimado (orquidômetro / ultrassom), em ml.",
        "efeito": f"+{COEF['testiculo_circ']} cm na circunferência por ml acima de "
        f"{REFS['testiculo_ref_ml']} ml. Não ajusta comprimento neste modelo.",
        "limite": "Preditor de girth, não de comprimento; medição varia por método.",
    },
    "ereto_cm": {
        "o_que_e": "Comprimento erecto estimado (osso-púbico até glande), cm.",
        "efeito": "Prior Veale + soma dos ajustes de comprimento.",
        "limite": "IC95% cobre quase toda a distribuição populacional.",
    },
    "circunferencia_ereta_cm": {
        "o_que_e": "Circunferência (girth) erecta no meio do eixo, cm.",
        "efeito": "Prior Veale + ajustes de nariz/IMC/testículo.",
        "limite": "Nariz contribui pouco; peso/testículo pesam mais.",
    },
    "flacido_cm": {
        "o_que_e": "Comprimento flácido estimado.",
        "efeito": f"Prior + {COEF['flacido_comp_frac']:.0%} do ajuste de comprimento erecto.",
        "limite": "Flácido varia mais com temperatura, ansiedade e gordura púbica.",
    },
    "circunferencia_flacida_cm": {
        "o_que_e": "Circunferência flácida estimada.",
        "efeito": f"Prior + {COEF['flacido_circ_frac']:.0%} do ajuste de circunferência erecta.",
        "limite": "Menos estável que a medida erecta.",
    },
    "diametro_eret_cm": {
        "o_que_e": "Diâmetro médio derivado da circunferência erecta (C/π).",
        "efeito": "Conversão geométrica; não é medido diretamente nos priors.",
        "limite": "Assume seção circular aproximada.",
    },
    "volume_cilindrico_ml": {
        "o_que_e": "Volume aproximado de um cilindro: π × (d/2)² × comprimento.",
        "efeito": "Útil só para ordem de grandeza comparativa.",
        "limite": "Pênis não é cilindro perfeito; superestima/subestima conforme anatomia.",
    },
    "z_score": {
        "o_que_e": "Quantos DPs a estimativa está da média Veale ((x−μ)/σ).",
        "efeito": "Permite comparar comprimento e circunferência na mesma escala.",
        "limite": "Ainda é relativo ao prior populacional, não a um clínico individual.",
    },
    "percentil_aprox": {
        "o_que_e": "Percentil normal aproximado a partir do z-score (Φ(z)×100).",
        "efeito": "Traduz z em 'posição' na curva populacional.",
        "limite": "Assume normalidade; caudas são imprecisas.",
    },
}

ENTRADAS_INVALIDAS = {
    "foto_rosto": "foto de rosto não mede nariz — rejeitada como entrada",
    "cor_pele": "cor de pele não entra no modelo",
    "cor_glande": "cor da glande não prediz tamanho",
}


def _ic95(media: float, dp: float) -> tuple[float, float]:
    return (round(media - 1.96 * dp, 1), round(media + 1.96 * dp, 1))


def _z(x: float, media: float, dp: float) -> float:
    return round((x - media) / dp, 2)


def _phi(z: float) -> float:
    """CDF da normal padrão via erf (sem dependências extras)."""
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _percentil(z: float) -> float:
    return round(100.0 * _phi(z), 1)


def _diametro_de_circunferencia(circ_cm: float) -> float:
    return round(circ_cm / math.pi, 2)


def _volume_cilindrico_ml(comp_cm: float, circ_cm: float) -> float:
    r = circ_cm / (2.0 * math.pi)
    return round(math.pi * r * r * comp_cm, 1)


def glossario(chave: str | None = None) -> dict[str, Any]:
    """Retorna o glossário completo ou um termo."""
    if chave is None:
        return dict(GLOSSARIO_TERMOS)
    if chave not in GLOSSARIO_TERMOS:
        raise KeyError(
            f"termo desconhecido: {chave!r}. "
            f"Válidos: {', '.join(sorted(GLOSSARIO_TERMOS))}"
        )
    return dict(GLOSSARIO_TERMOS[chave])


def estimar(
    nariz_cm: float | None = None,
    altura_cm: float | None = None,
    imc: float | None = None,
    razao_2d4d: float | None = None,
    volume_testicular_ml: float | None = None,
    nariz_ref_cm: float = REFS["nariz_ref_cm"],
    altura_ref_cm: float = REFS["altura_ref_cm"],
    imc_ref: float = REFS["imc_ref"],
    razao_2d4d_ref: float = REFS["razao_2d4d_ref"],
    testiculo_ref_ml: float = REFS["testiculo_ref_ml"],
    # Entradas explicitamente rejeitadas (aceitas só para documentar a recusa).
    foto_rosto: Any = None,
    cor_pele: Any = None,
    cor_glande: Any = None,
) -> dict[str, Any]:
    """Retorna médias ajustadas, IC95%, z, percentis, contribuições e glossário.

    Ajustes são lineares e pequenos de propósito. r² do melhor
    preditor publicado (nariz) fica em torno de 0,3 naquela amostra;
    para um indivíduo o intervalo continua quase populacional.
    """
    aj_comp = 0.0
    aj_circ = 0.0
    contribuicoes: list[dict[str, Any]] = []
    termos: list[str] = []
    rejeitadas: list[str] = []

    if foto_rosto is not None:
        rejeitadas.append(ENTRADAS_INVALIDAS["foto_rosto"])
    if cor_pele is not None:
        rejeitadas.append(ENTRADAS_INVALIDAS["cor_pele"])
    if cor_glande is not None:
        rejeitadas.append(ENTRADAS_INVALIDAS["cor_glande"])

    if nariz_cm is not None:
        d = nariz_cm - nariz_ref_cm
        dc = COEF["nariz_comp"] * d
        dg = COEF["nariz_circ"] * d
        aj_comp += dc
        aj_circ += dg
        termos.append(f"nariz {nariz_cm:.1f} cm (delta {d:+.1f})")
        contribuicoes.append(
            {
                "termo": "nariz_cm",
                "valor": nariz_cm,
                "delta_vs_ref": round(d, 3),
                "delta_comprimento_cm": round(dc, 3),
                "delta_circunferencia_cm": round(dg, 3),
                "faz": GLOSSARIO_TERMOS["nariz_cm"]["efeito"],
            }
        )

    if altura_cm is not None:
        d = altura_cm - altura_ref_cm
        dc = COEF["altura_comp"] * d
        aj_comp += dc
        termos.append(f"altura {altura_cm:.0f} cm (delta {d:+.0f})")
        contribuicoes.append(
            {
                "termo": "altura_cm",
                "valor": altura_cm,
                "delta_vs_ref": round(d, 3),
                "delta_comprimento_cm": round(dc, 3),
                "delta_circunferencia_cm": 0.0,
                "faz": GLOSSARIO_TERMOS["altura_cm"]["efeito"],
            }
        )

    if imc is not None:
        d = imc - imc_ref
        dc = COEF["imc_comp"] * d
        dg = COEF["imc_circ"] * d
        aj_comp += dc
        aj_circ += dg
        termos.append(f"IMC {imc:.1f} (delta {d:+.1f})")
        contribuicoes.append(
            {
                "termo": "imc",
                "valor": imc,
                "delta_vs_ref": round(d, 3),
                "delta_comprimento_cm": round(dc, 3),
                "delta_circunferencia_cm": round(dg, 3),
                "faz": GLOSSARIO_TERMOS["imc"]["efeito"],
            }
        )

    if razao_2d4d is not None:
        d = razao_2d4d_ref - razao_2d4d
        dc = COEF["d2d4d_comp"] * d
        aj_comp += dc
        termos.append(f"2D:4D {razao_2d4d:.2f}")
        contribuicoes.append(
            {
                "termo": "razao_2d4d",
                "valor": razao_2d4d,
                "delta_vs_ref": round(d, 3),
                "delta_comprimento_cm": round(dc, 3),
                "delta_circunferencia_cm": 0.0,
                "faz": GLOSSARIO_TERMOS["razao_2d4d"]["efeito"],
            }
        )

    if volume_testicular_ml is not None:
        d = volume_testicular_ml - testiculo_ref_ml
        dg = COEF["testiculo_circ"] * d
        aj_circ += dg
        termos.append(f"testículo {volume_testicular_ml:.0f} ml")
        contribuicoes.append(
            {
                "termo": "volume_testicular_ml",
                "valor": volume_testicular_ml,
                "delta_vs_ref": round(d, 3),
                "delta_comprimento_cm": 0.0,
                "delta_circunferencia_cm": round(dg, 3),
                "faz": GLOSSARIO_TERMOS["volume_testicular_ml"]["efeito"],
            }
        )

    ereto = round(MEDIA["ereto_cm"] + aj_comp, 1)
    circ = round(MEDIA["circunferencia_ereta_cm"] + aj_circ, 1)
    flacido = round(
        MEDIA["flacido_cm"] + COEF["flacido_comp_frac"] * aj_comp, 1
    )
    circ_f = round(
        MEDIA["circunferencia_flacida_cm"] + COEF["flacido_circ_frac"] * aj_circ, 1
    )

    z_ereto = _z(ereto, MEDIA["ereto_cm"], DP["ereto_cm"])
    z_circ = _z(circ, MEDIA["circunferencia_ereta_cm"], DP["circunferencia_ereta_cm"])
    z_flac = _z(flacido, MEDIA["flacido_cm"], DP["flacido_cm"])
    z_circ_f = _z(
        circ_f, MEDIA["circunferencia_flacida_cm"], DP["circunferencia_flacida_cm"]
    )

    # Derivados a partir dos valores já arredondados (consistência de saída).
    diam_e = _diametro_de_circunferencia(circ)
    diam_f = _diametro_de_circunferencia(circ_f)
    vol_e = _volume_cilindrico_ml(ereto, circ)
    vol_f = _volume_cilindrico_ml(flacido, circ_f)

    preditores_usados = [c["termo"] for c in contribuicoes]

    return {
        # Núcleo (compatível com a versão curta)
        "ereto_cm": ereto,
        "ereto_ic95_cm": _ic95(ereto, DP["ereto_cm"]),
        "circunferencia_ereta_cm": circ,
        "circunferencia_ereta_ic95_cm": _ic95(circ, DP["circunferencia_ereta_cm"]),
        "flacido_cm": flacido,
        "flacido_ic95_cm": _ic95(flacido, DP["flacido_cm"]),
        "circunferencia_flacida_cm": circ_f,
        "circunferencia_flacida_ic95_cm": _ic95(
            circ_f, DP["circunferencia_flacida_cm"]
        ),
        "ajuste_comprimento_cm": round(aj_comp, 2),
        "ajuste_circunferencia_cm": round(aj_circ, 2),
        "termos": termos or ["nenhum; prior populacional"],
        # Extensões
        "diametro_eret_cm": diam_e,
        "diametro_flacido_cm": diam_f,
        "volume_cilindrico_eret_ml": vol_e,
        "volume_cilindrico_flacido_ml": vol_f,
        "z_scores": {
            "ereto": z_ereto,
            "circunferencia_ereta": z_circ,
            "flacido": z_flac,
            "circunferencia_flacida": z_circ_f,
        },
        "percentis_aprox": {
            "ereto": _percentil(z_ereto),
            "circunferencia_ereta": _percentil(z_circ),
            "flacido": _percentil(z_flac),
            "circunferencia_flacida": _percentil(z_circ_f),
        },
        "contribuicoes": contribuicoes
        or [
            {
                "termo": "prior_populacional",
                "valor": None,
                "delta_vs_ref": 0.0,
                "delta_comprimento_cm": 0.0,
                "delta_circunferencia_cm": 0.0,
                "faz": GLOSSARIO_TERMOS["prior_populacional"]["efeito"],
            }
        ],
        "preditores_usados": preditores_usados,
        "referencias": {
            "medias": dict(MEDIA),
            "desvios_padrao": dict(DP),
            "coeficientes": dict(COEF),
            "refs_centrais": {
                "nariz_ref_cm": nariz_ref_cm,
                "altura_ref_cm": altura_ref_cm,
                "imc_ref": imc_ref,
                "razao_2d4d_ref": razao_2d4d_ref,
                "testiculo_ref_ml": testiculo_ref_ml,
            },
            "fontes": FONTES,
        },
        "o_que_cada_termo_faz": {
            k: GLOSSARIO_TERMOS[k]
            for k in (
                ["prior_populacional"]
                if not preditores_usados
                else preditores_usados
            )
            + [
                "ereto_cm",
                "circunferencia_ereta_cm",
                "flacido_cm",
                "circunferencia_flacida_cm",
                "diametro_eret_cm",
                "volume_cilindrico_ml",
                "z_score",
                "percentil_aprox",
            ]
        },
        "entradas_rejeitadas": rejeitadas,
        "limites": [
            "foto de rosto não mede nariz",
            "cor da glande não prediz tamanho",
            "cor de pele não entra no modelo",
            "intervalo de 95% cobre quase a distribuição inteira",
            "melhor preditor (nariz) tem r²≈0,3 — uso individual permanece incerto",
            "volume cilíndrico é aproximação geométrica, não medida clínica",
        ],
    }


def formatar_relatorio(resultado: dict[str, Any]) -> str:
    """Texto legível com totais e o que cada termo fez."""
    linhas = [
        "=== Estimativa antropométrica (grosseira) ===",
        f"Ereto:              {resultado['ereto_cm']} cm  "
        f"IC95 {resultado['ereto_ic95_cm']}  "
        f"z={resultado['z_scores']['ereto']}  "
        f"~P{resultado['percentis_aprox']['ereto']}",
        f"Circ. ereta:        {resultado['circunferencia_ereta_cm']} cm  "
        f"IC95 {resultado['circunferencia_ereta_ic95_cm']}  "
        f"z={resultado['z_scores']['circunferencia_ereta']}  "
        f"~P{resultado['percentis_aprox']['circunferencia_ereta']}",
        f"Flácido:            {resultado['flacido_cm']} cm  "
        f"IC95 {resultado['flacido_ic95_cm']}",
        f"Circ. flácida:      {resultado['circunferencia_flacida_cm']} cm",
        f"Diâmetro ereto:     {resultado['diametro_eret_cm']} cm",
        f"Vol. cil. ereto:    {resultado['volume_cilindrico_eret_ml']} ml",
        f"Ajuste comp/circ:   {resultado['ajuste_comprimento_cm']:+.2f} / "
        f"{resultado['ajuste_circunferencia_cm']:+.2f} cm",
        "",
        "--- Contribuições (o que cada termo fez) ---",
    ]
    for c in resultado["contribuicoes"]:
        linhas.append(
            f"* {c['termo']}: Δcomp {c['delta_comprimento_cm']:+.3f} cm, "
            f"Δcirc {c['delta_circunferencia_cm']:+.3f} cm"
        )
        linhas.append(f"  → {c['faz']}")
    if resultado["entradas_rejeitadas"]:
        linhas.append("")
        linhas.append("--- Entradas rejeitadas ---")
        for r in resultado["entradas_rejeitadas"]:
            linhas.append(f"* {r}")
    linhas.append("")
    linhas.append("--- Limites ---")
    for lim in resultado["limites"]:
        linhas.append(f"* {lim}")
    return "\n".join(linhas)


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Estimativa antropométrica grosseira (prior Veale + ajustes fracos)."
    )
    p.add_argument("--nariz-cm", type=float, default=None)
    p.add_argument("--altura-cm", type=float, default=None)
    p.add_argument("--imc", type=float, default=None)
    p.add_argument("--razao-2d4d", type=float, default=None)
    p.add_argument("--volume-testicular-ml", type=float, default=None)
    p.add_argument(
        "--foto-rosto",
        action="store_true",
        help="Demonstra rejeição: foto não é entrada válida",
    )
    p.add_argument("--json", action="store_true", help="Imprime JSON completo")
    p.add_argument(
        "--glossario",
        nargs="?",
        const="__all__",
        default=None,
        help="Imprime glossário (ou um termo)",
    )
    return p


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    if args.glossario is not None:
        data = glossario(None if args.glossario == "__all__" else args.glossario)
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0

    out = estimar(
        nariz_cm=args.nariz_cm,
        altura_cm=args.altura_cm,
        imc=args.imc,
        razao_2d4d=args.razao_2d4d,
        volume_testicular_ml=args.volume_testicular_ml,
        foto_rosto=True if args.foto_rosto else None,
    )
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(formatar_relatorio(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
