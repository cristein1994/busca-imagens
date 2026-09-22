# Bot Telegram — Vagas por CNPJ

Consulta CNPJ (BrasilAPI), descobre a página de carreiras e lista vagas de **Gupy**, **Greenhouse** e **Lever**.

## Comandos

| Comando | Descrição |
|---------|-----------|
| `/start` | Ajuda |
| `/cnpj 00000000000191` | Busca por CNPJ |
| `/nome Nome da Empresa` | Tenta achar o site e as vagas |
| `/site empresa.com.br` | Usa o domínio direto |

## Pré-requisitos

- Python 3.10+
- Token do bot no [@BotFather](https://t.me/BotFather)

## Instalação

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edite .env e defina TELEGRAM_TOKEN=...
```

## Executar

```bash
python run.py
# ou
python -m bot.main
```

O bot fica em polling até você interromper com Ctrl+C.

## Fluxo

1. `/cnpj` → BrasilAPI (`/api/cnpj/v1/{cnpj}`) → razão social + site (ou domínio do e-mail).
2. Varre caminhos comuns (`/carreiras`, `/careers`, `/vagas`, …) e links no HTML.
3. Se a URL for Gupy / Greenhouse / Lever (ou apontar para um deles), chama a API pública de vagas.
4. Envia até 20 vagas no chat.

## Testes

```bash
pip install -r requirements.txt pytest
pytest -q
```

## Limitações

- BrasilAPI nem sempre informa o site da empresa.
- Busca por `/nome` depende de resultados públicos (DuckDuckGo) e pode falhar.
- Só ATS suportados: Gupy, Greenhouse, Lever.
- Respeite termos de uso das APIs e sites consultados; use de forma responsável.

## Estrutura

```
bot/
  config.py      # env / token
  cnpj.py        # BrasilAPI
  careers.py     # descoberta de URL de carreiras
  jobs.py        # Gupy / Greenhouse / Lever
  handlers.py    # comandos Telegram
  formatters.py  # Markdown
  main.py        # bootstrap
run.py
requirements.txt
.env.example
```

## Licença

Uso livre para estudo e automação pessoal.
