from __future__ import annotations

import sys

from telegram.ext import Application, CommandHandler

from bot.config import TELEGRAM_TOKEN
from bot.handlers import buscar_por_cnpj, buscar_por_nome, buscar_por_site, start


def main() -> None:
    if not TELEGRAM_TOKEN or TELEGRAM_TOKEN == "SEU_TOKEN_AQUI":
        print(
            "Erro: defina TELEGRAM_TOKEN no arquivo .env "
            "(copie de .env.example e cole o token do @BotFather).",
            file=sys.stderr,
        )
        sys.exit(1)

    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("cnpj", buscar_por_cnpj))
    app.add_handler(CommandHandler("nome", buscar_por_nome))
    app.add_handler(CommandHandler("site", buscar_por_site))

    print("Bot iniciado (polling)...")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
