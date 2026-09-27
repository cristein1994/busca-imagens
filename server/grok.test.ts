import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  askGrok,
  handleGrokRequest,
  parseCompletion,
  resolveGrokConfig,
  sanitizeMessages,
  type GrokConfig,
} from './grok.ts'

const configured: GrokConfig = {
  configured: true,
  apiKey: 'secret-key',
  model: 'grok-4.7',
}

describe('resolveGrokConfig', () => {
  it('treats missing and placeholder keys as not configured', () => {
    assert.equal(resolveGrokConfig({}).configured, false)
    assert.equal(resolveGrokConfig({ XAI_API_KEY: '  sua_api_key_aqui  ' }).configured, false)
  })

  it('keeps a real key and falls back when the model id is invalid', () => {
    const config = resolveGrokConfig({
      XAI_API_KEY: ' xai-real ',
      GROK_MODEL: 'not a model',
    })
    assert.equal(config.configured, true)
    assert.equal(config.apiKey, 'xai-real')
    assert.equal(config.model, 'grok-4.7')
  })
})

describe('sanitizeMessages', () => {
  it('drops unknown roles and requires a user message at the end', () => {
    const result = sanitizeMessages([
      { role: 'system', content: 'ignore' },
      { role: 'assistant', content: 'oi' },
      { role: 'user', content: '  praia  ' },
    ])
    assert.deepEqual(result, {
      ok: true,
      messages: [{ role: 'user', content: 'praia' }],
    })
  })

  it('rejects an empty conversation', () => {
    const result = sanitizeMessages([{ role: 'assistant', content: 'oi' }])
    assert.equal(result.ok, false)
  })
})

describe('parseCompletion', () => {
  it('reads the reply and the search tool call', () => {
    const result = parseCompletion({
      choices: [
        {
          message: {
            content: 'Vou buscar gatos.',
            tool_calls: [
              {
                function: {
                  name: 'search_images',
                  arguments: '{"query":" sleeping cats "}',
                },
              },
            ],
          },
        },
      ],
    })
    assert.deepEqual(result, {
      reply: 'Vou buscar gatos.',
      searchQuery: 'sleeping cats',
    })
  })

  it('builds a reply when the model only calls the tool', () => {
    const result = parseCompletion({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              { function: { name: 'search_images', arguments: { query: 'fog forest' } } },
            ],
          },
        },
      ],
    })
    assert.equal(result.searchQuery, 'fog forest')
    assert.match(result.reply, /fog forest/)
  })
})

describe('handleGrokRequest', () => {
  it('reports configuration without exposing the key', async () => {
    const result = await handleGrokRequest({ method: 'GET', config: configured })
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { configured: true, model: 'grok-4.7' })
  })

  it('refuses to chat when the key is missing', async () => {
    let called = false
    const result = await handleGrokRequest({
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'oi' }] }),
      config: { configured: false, model: 'grok-4.7' },
      fetchImpl: async () => {
        called = true
        return new Response('{}')
      },
    })
    assert.equal(result.status, 503)
    assert.equal(called, false)
  })

  it('calls xAI with the server key and returns the search query', async () => {
    let authorization = ''
    let requestBody = ''
    const result = await handleGrokRequest({
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'quero fotos de gatos' }],
      }),
      config: configured,
      fetchImpl: async (_url, init) => {
        authorization = new Headers(init?.headers).get('authorization') ?? ''
        requestBody = String(init?.body ?? '')
        return Response.json({
          choices: [
            {
              message: {
                content: 'Vou buscar gatos.',
                tool_calls: [
                  { function: { name: 'search_images', arguments: '{"query":"cats"}' } },
                ],
              },
            },
          ],
        })
      },
    })

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { reply: 'Vou buscar gatos.', searchQuery: 'cats' })
    assert.equal(authorization, 'Bearer secret-key')
    assert.equal(requestBody.includes('secret-key'), false)
    assert.match(requestBody, /"model":"grok-4.7"/)
  })

  it('hides the API key if the upstream error echoes it', async () => {
    const result = await askGrok({
      config: configured,
      messages: [{ role: 'user', content: 'oi' }],
      fetchImpl: async () =>
        Response.json({ error: { message: 'bad key secret-key in request' } }, { status: 400 }),
    }).then(
      () => {
        throw new Error('expected failure')
      },
      (err: unknown) => err,
    )

    assert.ok(result instanceof Error)
    assert.equal(result.message.includes('secret-key'), false)
    assert.match(result.message, /bad key/)
  })
})
