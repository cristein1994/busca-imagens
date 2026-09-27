import { MODELS, nowIso, type Session } from './types.ts'

export type CommandOutcome = {
  handled: boolean
  exit?: boolean
  note?: string
}

const HELP = [
  'RODE — terminal do Grok',
  '',
  '  rode                 sessão interativa',
  '  rode -p "texto"      uma pergunta e sai',
  '  rode serve           terminal no navegador',
  '  rode inspect         modelo, sessão e chave',
  '',
  'Dentro da sessão:',
  '  /help                esta ajuda',
  '  /model <id>          troca o modelo e reinicia o fio',
  '  /models              lista modelos conhecidos',
  '  /system <texto>      prompt de sistema e reinicia o fio',
  '  /search on|off       web_search e x_search na API',
  '  /clear               zera a conversa',
  '  /history             mostra o fio',
  '  /exit                sai',
].join('\n')

function note(session: Session, text: string) {
  session.turns.push({ role: 'note', text, at: nowIso() })
}

export function dispatch(session: Session, line: string): CommandOutcome {
  const trimmed = line.trim()
  if (!trimmed.startsWith('/')) return { handled: false }

  const [head, ...rest] = trimmed.slice(1).split(/\s+/)
  const arg = rest.join(' ').trim()
  const name = (head ?? '').toLowerCase()

  if (name === 'help' || name === '?') {
    note(session, HELP)
    return { handled: true, note: HELP }
  }

  if (name === 'exit' || name === 'quit') {
    return { handled: true, exit: true, note: 'sessão encerrada' }
  }

  if (name === 'clear') {
    session.turns = []
    session.previousResponseId = null
    note(session, 'conversa limpa')
    return { handled: true, note: 'conversa limpa' }
  }

  if (name === 'models') {
    const text = MODELS.map((model) => `  ${model.id}  ${model.label}`).join('\n')
    note(session, text)
    return { handled: true, note: text }
  }

  if (name === 'model') {
    if (!arg) {
      const text = `modelo atual: ${session.model}`
      note(session, text)
      return { handled: true, note: text }
    }
    session.model = arg
    session.previousResponseId = null
    const known = MODELS.some((model) => model.id === arg)
    const text = known
      ? `modelo ${arg}. fio reiniciado`
      : `modelo ${arg} (fora da lista conhecida). fio reiniciado`
    note(session, text)
    return { handled: true, note: text }
  }

  if (name === 'system') {
    if (!arg) {
      const text = session.system
      note(session, text)
      return { handled: true, note: text }
    }
    session.system = arg
    session.previousResponseId = null
    const text = 'prompt de sistema atualizado. fio reiniciado'
    note(session, text)
    return { handled: true, note: text }
  }

  if (name === 'search') {
    const value = arg.toLowerCase()
    if (value !== 'on' && value !== 'off') {
      const text = 'use /search on ou /search off'
      note(session, text)
      return { handled: true, note: text }
    }
    session.search = value === 'on'
    const text = session.search ? 'busca ligada' : 'busca desligada'
    note(session, text)
    return { handled: true, note: text }
  }

  if (name === 'history') {
    const lines = session.turns
      .filter((turn) => turn.role !== 'note')
      .map((turn) => `${turn.role === 'user' ? 'rode>' : 'grok>'} ${turn.text}`)
    const text = lines.length > 0 ? lines.join('\n\n') : 'sem histórico'
    note(session, text)
    return { handled: true, note: text }
  }

  const text = `comando desconhecido: /${name}. /help lista os comandos`
  note(session, text)
  return { handled: true, note: text }
}
