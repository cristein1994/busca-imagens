import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import type { AddressInfo } from 'node:net'
import { emptySession } from '../shared/types.ts'
import { runTurn } from './chat.ts'
import { GrokError, streamGrok } from './grok.ts'

test('rejeita chamada sem chave', async () => {
  await assert.rejects(
    async () => {
      for await (const _event of streamGrok({ apiKey: '', model: 'grok-4.7', input: 'oi' })) {
        /* não deve emitir */
      }
    },
    (error: unknown) => error instanceof GrokError && /XAI_API_KEY/.test(error.message),
  )
})

test('imprime deltas e guarda o id da resposta', async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.write('data: {"type":"response.output_text.delta","delta":"Ol"}\n\n')
    res.write('data: {"type":"response.output_text.delta","delta":"á"}\n\n')
    res.write(
      'data: {"type":"response.completed","response":{"id":"resp_test","output_text":"Olá"}}\n\n',
    )
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const session = emptySession()
  const deltas: string[] = []
  let doneId: string | null = null

  try {
    for await (const event of runTurn({
      root: '/tmp',
      session,
      text: 'ping',
      apiKey: 'xai-test',
      endpoint: `http://127.0.0.1:${port}/v1/responses`,
    })) {
      if (event.kind === 'delta') deltas.push(event.text)
      if (event.kind === 'done') doneId = event.responseId
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }

  assert.deepEqual(deltas, ['Ol', 'á'])
  assert.equal(doneId, 'resp_test')
  assert.equal(session.previousResponseId, 'resp_test')
  assert.equal(session.turns.filter((turn) => turn.role === 'assistant').at(-1)?.text, 'Olá')
})
