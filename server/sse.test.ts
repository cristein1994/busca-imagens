import assert from 'node:assert/strict'
import test from 'node:test'
import { pushSse } from '../shared/sse.ts'

test('junta eventos SSE partidos no meio do chunk', () => {
  const first = pushSse('', 'data: {"type":"response.output_text.delta","delta":"Ol"}\n\n')
  assert.equal(first.events.length, 1)
  assert.equal(first.events[0]?.data, '{"type":"response.output_text.delta","delta":"Ol"}')

  const split = pushSse('', 'data: {"type":"response.output_text.delta","del')
  assert.equal(split.events.length, 0)
  const rest = pushSse(split.buffer, 'ta":"á"}\n\ndata: [DONE]\n\n')
  assert.equal(rest.events.length, 2)
  assert.equal(rest.events[1]?.data, '[DONE]')
})
