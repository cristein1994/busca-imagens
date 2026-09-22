from bot.cnpj import extrair_socios, limpar_cnpj, validar_cnpj
from bot.formatters import escape_md, formatar_lista_socios, formatar_vaga
from bot.jobs import buscar_vagas_por_url


def test_limpar_cnpj():
    assert limpar_cnpj("00.000.000/0001-91") == "00000000000191"


def test_validar_cnpj_banco_brasil():
    assert validar_cnpj("00000000000191") is True


def test_validar_cnpj_invalido():
    assert validar_cnpj("11111111111111") is False
    assert validar_cnpj("123") is False


def test_escape_md():
    assert escape_md("foo_bar*baz") == r"foo\_bar\*baz"


def test_formatar_vaga():
    text = formatar_vaga(
        {
            "titulo": "Dev_Python",
            "local": "SP",
            "departamento": "Eng",
            "link": "https://example.com/job/1",
        }
    )
    assert "Dev\\_Python" in text
    assert "https://example.com/job/1" in text


def test_buscar_vagas_url_vazia():
    assert buscar_vagas_por_url("") == []


def test_buscar_vagas_url_sem_ats():
    assert buscar_vagas_por_url("https://example.com/carreiras") == []


def test_extrair_socios():
    dados = {
        "qsa": [
            {
                "nome_socio": "FULANO DA SILVA",
                "qualificacao_socio": "Sócio-Administrador",
                "cnpj_cpf_do_socio": "***123456**",
                "data_entrada_sociedade": "2020-01-15",
                "faixa_etaria": "Entre 31 a 40 anos",
                "nome_representante_legal": "",
            },
            {"nome_socio": "", "qualificacao_socio": "Diretor"},
        ]
    }
    socios = extrair_socios(dados)
    assert len(socios) == 1
    assert socios[0]["nome"] == "FULANO DA SILVA"
    assert socios[0]["qualificacao"] == "Sócio-Administrador"


def test_formatar_lista_socios():
    blocos = formatar_lista_socios(
        [{"nome": "A_B", "qualificacao": "Diretor", "documento": "***1**"}]
    )
    assert len(blocos) == 1
    assert "A\\_B" in blocos[0]
    assert "Associados ao CNPJ" in blocos[0]


def test_formatar_lista_socios_vazia():
    assert "Nenhum sócio" in formatar_lista_socios([])[0]
