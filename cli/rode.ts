import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dispatch } from '../shared/commands.ts'
import type { Session } from '../shared/types.ts'
import { runTurn } from '../server/chat.ts'
import { apiKey, keyConfigured, loadProjectEnv } from '../server/env.ts'
import { loadSession, saveSession, sessionFile } from '../server/sessionStore.ts'
import { startServer } from '../server/http.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VERSION = '0.1.0'

const HELP = `RODE ${VERSION} — terminal do Grok

Uso
  rode                  sessão interativa
  rode -p "texto"       uma pergunta e sai
  rode serve            terminal no navegador
  rode inspect          modelo, sessão e chave
  rode --help

Flags
  -p, --prompt <texto>  modo único
  -m, --model <id>      modelo desta execução
  --fresh               ignora o fio anterior
  --search              liga web_search e x_search
  --port <n>            porta do rode serve (padrão 5173)
`

type Flags = {
  help: boolean
  version: boolean
  inspect: boolean
  serve: boolean
  fresh: boolean
  search: boolean
  prompt?: string
  model?: string
  port?: number
}

function parseArgs(argv: string[]): Flags {
  const flags: Flags = {
    help: false,
    version: false,
    inspect: false,
    serve: false,
    fresh: false,
    search: false,
  }
  const rest: string[] = []
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? ''
    if (arg === '--help' || arg === '-h') flags.help = true
    else if (arg === '--version' || arg === '-v') flags.version = true
    else if (arg === '--fresh') flags.fresh = true
    else if (arg === '--search') flags.search = true
    else if (arg === 'serve') flags.serve = true
    else if (arg === 'inspect') flags.inspect = true
    else if (arg === '-p' || arg === '--prompt') {
      flags.prompt = argv[i + 1] ?? ''
      i += 1
    } else if (arg === '-m' || arg === '--model') {
      flags.model = argv[i + 1] ?? ''
      i += 1
    } else if (arg === '--port') {
      flags.port = Number(argv[i + 1])
      i += 1
    } else if (arg.startsWith('-')) {
      throw new Error(`flag desconhecida: ${arg}`)
    } else rest.push(arg)
  }
  if (!flags.prompt && rest.length > 0 && !flags.serve && !flags.inspect) {
    flags.prompt = rest.join(' ')
  }
  return flags
}

function applyFlags(session: Session, flags: Flags) {
  if (flags.fresh) {
    session.previousResponseId = null
    session.turns = []
  }
  if (flags.model) {
    session.model = flags.model
    session.previousResponseId = null
  }
  if (flags.search) session.search = true
}

function missingKey(): string {
  return [
    'XAI_API_KEY ausente.',
    'Crie uma chave em https://console.x.ai',
    'e grave no .env:',
    'XAI_API_KEY=xai-...',
  ].join('\n')
}

async function oneShot(session: Session, text: string) {
  if (!keyConfigured()) {
    console.error(missingKey())
    process.exitCode = 1
    return
  }
  let started = false
  try {
    for await (const event of runTurn({
      root,
      session,
      text,
      apiKey: apiKey(),
    })) {
      if (event.kind === 'delta') {
        started = true
        process.stdout.write(event.text)
      }
    }
    if (started) process.stdout.write('\n')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'falha'
    if (started) process.stdout.write('\n')
    console.error(message)
    process.exitCode = 1
  }
}

async function repl(session: Session) {
  console.log('\x1b[32mRODE\x1b[0m  terminal grok')
  console.log(`modelo ${session.model}  ·  /help`)
  if (!keyConfigured()) console.log(`\x1b[33m${missingKey()}\x1b[0m`)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[33mrode>\x1b[0m ',
    terminal: true,
  })

  let busy = false
  let abort: AbortController | null = null

  const ask = () => {
    if (!busy) rl.prompt()
  }

  rl.on('line', (line) => {
    const text = line.trim()
    if (!text) {
      ask()
      return
    }
    if (text.startsWith('/')) {
      const outcome = dispatch(session, text)
      saveSession(root, session)
      if (outcome.note) console.log(`\x1b[2m${outcome.note}\x1b[0m`)
      if (outcome.exit) {
        rl.close()
        return
      }
      ask()
      return
    }
    if (!keyConfigured()) {
      console.error(missingKey())
      ask()
      return
    }
    busy = true
    abort = new AbortController()
    void (async () => {
      let started = false
      try {
        for await (const event of runTurn({
          root,
          session,
          text,
          apiKey: apiKey(),
          signal: abort?.signal,
        })) {
          if (event.kind === 'delta') {
            started = true
            process.stdout.write(`\x1b[32m${event.text}\x1b[0m`)
          }
        }
        if (started) process.stdout.write('\n')
      } catch (error) {
        if (abort?.signal.aborted) console.log('\n\x1b[2minterrompido\x1b[0m')
        else {
          if (started) process.stdout.write('\n')
          console.error(error instanceof Error ? error.message : 'falha')
        }
      } finally {
        busy = false
        abort = null
        ask()
      }
    })()
  })

  rl.on('SIGINT', () => {
    if (busy && abort) {
      abort.abort()
      return
    }
    rl.close()
  })

  rl.on('close', () => {
    process.stdout.write('\n')
    process.exit(process.exitCode ?? 0)
  })

  ask()
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8').trim()
}

async function main() {
  loadProjectEnv(root)
  let flags: Flags
  try {
    flags = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'argumento inválido')
    process.exitCode = 1
    return
  }

  if (flags.help) {
    console.log(HELP)
    return
  }
  if (flags.version) {
    console.log(VERSION)
    return
  }
  if (flags.serve) {
    const { port } = await startServer(flags.port)
    console.log(`RODE no ar: http://127.0.0.1:${port}`)
    return
  }

  const session = loadSession(root)
  applyFlags(session, flags)

  if (flags.inspect) {
    console.log('RODE')
    console.log(`chave     ${keyConfigured() ? 'presente' : 'ausente'}`)
    console.log(`modelo    ${session.model}`)
    console.log(`busca     ${session.search ? 'on' : 'off'}`)
    console.log(`sessão    ${sessionFile(root)}`)
    console.log(`turnos    ${session.turns.length}`)
    return
  }

  let prompt = flags.prompt
  if (!prompt && !process.stdin.isTTY) prompt = await readStdin()
  if (prompt) {
    saveSession(root, session)
    await oneShot(session, prompt)
    return
  }

  saveSession(root, session)
  await repl(session)
}

await main()
