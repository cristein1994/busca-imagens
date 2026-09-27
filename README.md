# Channel Engine

Search public Telegram channels and groups by topic, language, or username.

The app keeps a catalog of public chats, refreshes the top matches from Telegram’s public `t.me` pages, and looks up extra results in the public [Lyzem](https://lyzem.com) index. It does not log into Telegram and it does not read private chats.

## Features

- Search channels and groups by keyword, `@username`, or `t.me` link
- Filter by type (channel or group), topic, and language
- Sort by relevance or audience size
- Open a chat for the live subscriber or member count, description, and a public post preview when Telegram publishes one
- Copy the public link or username, or open the chat in Telegram

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

No API key is required.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server and search API |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview the production build with the search API |
| `npm run test` | Parser tests |
| `npm run lint` | Lint with oxlint |

## How search works

1. A built-in catalog matches title, username, description, and topic. Counts in the catalog are snapshots from public `t.me` pages.
2. A keyword search also reads Lyzem’s public search page for channels and groups.
3. The top results, and any exact username, are refreshed from `https://t.me/<username>`.
4. Opening a result loads that public page again, plus `https://t.me/s/<username>` when a post preview exists.

## Stack

- Vite, React, and TypeScript
- CSS modules
- A small Vite middleware for `/api/search` and `/api/chat`
