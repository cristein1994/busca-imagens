from bot.cnpj import limpar_cnpj, validar_cnpj
from bot.formatters import escape_md, formatar_vaga
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
