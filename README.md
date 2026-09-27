# Pponak

Verificador para a satchel **ALDO Pponak** e o iPhone. O corpo da bolsa entra na mesma escala do aparelho. O bolso de celular é anunciado nas fichas e não tem milímetros publicados: você mede a boca e o app diz se cabe, se fica justo ou se não entra.

A folga mínima é 4 mm. A capa soma o valor escolhido dos dois lados. No iPhone Air, a profundidade usa o relevo da câmera (cerca de 11,7 mm). Nos outros modelos, a profundidade é a do corpo publicada pela Apple.

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço do Vite, em geral `http://localhost:5173`. Não há chave de API.

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos e build |
| `npm run preview` | Pré-visualiza o build |
| `npm run lint` | Lint com oxlint |
| `npm run check` | Regras de encaixe (cabe, justo, não cabe) |

## Medidas

A frente da bolsa usa a ficha pública do artigo A0151H1XF: 44 cm de comprimento, 50 cm de altura, 22 cm de largura e 800 g. Os iPhones usam as fichas da Apple (16, 17, Air, 17 Pro, 18 Pro).

Este projeto não é da ALDO nem da Apple.
