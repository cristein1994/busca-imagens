export const MIN_RESULTS = Number(process.env.OSINT_MIN_RESULTS ?? 30)
export const MAX_RESULTS = Math.max(MIN_RESULTS, 40)
export const TOR_SOCKS = process.env.TOR_SOCKS_URL ?? 'socks5h://127.0.0.1:9050'

export const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
