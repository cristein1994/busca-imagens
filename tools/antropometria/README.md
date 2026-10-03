# Estimador antropométrico (grosseiro)

Prior populacional Veale 2015 + ajustes lineares fracos (nariz, altura, IMC, 2D:4D, volume testicular).

## O que cada termo faz

| Termo | Efeito no modelo |
|--------|------------------|
| *(nenhum)* | Devolve o prior: ~13,1 cm ereto, circ. ~11,7 cm |
| `nariz_cm` | +0,60 cm comprimento / +0,15 cm circ. por cm acima de 4,6 cm |
| `altura_cm` | +0,03 cm comprimento por cm acima de 175 cm |
| `imc` | −0,08 cm comprimento / +0,04 cm circ. por unidade acima de 23 |
| `razao_2d4d` | razão menor → comprimento um pouco maior (coef 1,5 × (0,96 − razão)) |
| `volume_testicular_ml` | +0,04 cm circ. por ml acima de 18; não mexe no comprimento |

**Não entram:** foto de rosto, cor de pele, cor da glande.

## Saídas extras (vs. versão curta)

- IC95% também para circunferência flácida
- Diâmetro (C/π) e volume cilíndrico aproximado
- Z-scores e percentis aproximados
- Lista `contribuicoes` com Δ de cada preditor
- Bloco `o_que_cada_termo_faz` (glossário embutido)
- `entradas_rejeitadas` quando foto/cor são passadas

## Uso

```bash
python3 tools/antropometria/estimador.py
python3 tools/antropometria/estimador.py --nariz-cm 5.2 --altura-cm 180 --imc 22
python3 tools/antropometria/estimador.py --json --nariz-cm 5.0 --volume-testicular-ml 20
python3 tools/antropometria/estimador.py --glossario
python3 tools/antropometria/estimador.py --glossario nariz_cm
python3 tools/antropometria/estimador.py --foto-rosto   # só registra rejeição
```

```python
from tools.antropometria.estimador import estimar, glossario

print(estimar())
print(estimar(nariz_cm=5.2, altura_cm=180, imc=22))
print(glossario("imc"))
```

## Limites

Melhor preditor publicado (nariz) tem r² ≈ 0,3. Para um indivíduo o IC95% continua quase populacional. Isto não é diagnóstico clínico.
