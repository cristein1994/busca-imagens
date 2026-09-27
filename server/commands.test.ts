import assert from 'node:assert/strict'
import test from 'node:test'
import { dispatch } from '../shared/commands.ts'
import { emptySession } from '../shared/types.ts'

test('comandos locais mudam a sessão sem chamar a API', () => {
  const session = emptySession()
  session.previousResponseId = 'resp_old'
  session.turns.push({ role: 'user', text: 'oi', at: '2026-01-01T00:00:00.000Z' })

  const cleared = dispatch(session, '/clear')
  assert.equal(cleared.handled, true)
  assert.equal(session.previousResponseId, null)
  assert.equal(session.turns.at(-1)?.text, 'conversa limpa')

  const model = dispatch(session, '/model grok-3-mini')
  assert.match(model.note ?? '', /grok-3-mini/)
  assert.equal(session.model, 'grok-3-mini')

  const search = dispatch(session, '/search on')
  assert.equal(session.search, true)
  assert.equal(search.exit, undefined)

  const exit = dispatch(session, '/exit')
  assert.equal(exit.exit, true)

  const chat = dispatch(session, 'isto não é comando')
  assert.equal(chat.handled, false)
})
