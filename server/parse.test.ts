import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Chat } from '../shared/chat.ts'
import {
  decodeHtml,
  dedupeScored,
  extractHandle,
  parseChannelPosts,
  parseCounts,
  parseLyzem,
  parseTelegramPage,
  scoreChat,
} from './parse.ts'

const channelHtml = `
<meta property="og:title" content="Telegram News">
<meta property="og:image" content="https://cdn1.telesco.pe/file/abc.jpg">
<meta property="og:description" content="Official channel">
<div class="tgme_page_title"><span dir="auto">Telegram News</span><i class="verified-icon"> ✔</i></div>
<div class="tgme_page_extra">9 457 687 subscribers</div>
<div class="tgme_page_description" dir="auto">The official Telegram. Read them&#33;</div>
`

const groupHtml = `
<meta property="og:title" content="Python">
<meta property="og:image" content="https://cdn4.telesco.pe/file/abc.jpg">
<div class="tgme_page_extra">95 451 members, 4 445 online</div>
<div class="tgme_page_description" dir="auto">A group about the Python programming language.</div>
`

test('decodeHtml turns entities into text and drops tags', () => {
  assert.equal(decodeHtml('Read them&#33; <b>now</b>'), 'Read them! now')
})

test('parseCounts distinguishes channels and groups', () => {
  assert.deepEqual(parseCounts('9 457 687 subscribers'), {
    members: 9457687,
    online: null,
    type: 'channel',
  })
  assert.deepEqual(parseCounts('95 451 members, 4 445 online'), {
    members: 95451,
    online: 4445,
    type: 'group',
  })
  assert.equal(parseCounts('@someone').type, null)
})

test('parseTelegramPage reads a public channel and ignores non-chats', () => {
  const channel = parseTelegramPage(channelHtml, 'telegram')
  assert.equal(channel?.title, 'Telegram News')
  assert.equal(channel?.type, 'channel')
  assert.equal(channel?.verified, true)
  assert.equal(channel?.members, 9457687)
  assert.match(channel?.description ?? '', /Read them!/)
  assert.equal(channel?.photo?.startsWith('https://cdn1.telesco.pe/'), true)

  const group = parseTelegramPage(groupHtml, 'python')
  assert.equal(group?.type, 'group')
  assert.equal(group?.online, 4445)
  assert.equal(parseTelegramPage('<html><body>missing</body></html>', 'nope'), null)
  assert.equal(parseTelegramPage(channelHtml, 'bad name'), null)
})

test('parseLyzem reads channel and group cards', () => {
  const html = `
    <li class="search-result">
      <div class="search-result-type-wrapper" title="channel"></div>
      <p class="search-result-title"><a href="https://t.me/python3">python</a></p>
      <p class="search-result-descr"><a href="https://t.me/python3">Python news</a></p>
    </li>
    <li class="search-result">
      <div class="search-result-type-wrapper" title="group"></div>
      <p class="search-result-title"><a href="https://t.me/python">Python</a></p>
      <p class="search-result-descr"><a href="https://t.me/python">A group</a></p>
    </li>
    <li class="search-result">
      <div class="search-result-type-wrapper" title="bot"></div>
      <p class="search-result-title"><a href="https://t.me/pythonbot">bot</a></p>
    </li>
  `
  const hits = parseLyzem(html)
  assert.equal(hits.length, 2)
  assert.deepEqual(hits.map((hit) => hit.username), ['python3', 'python'])
  assert.equal(hits[1]?.type, 'group')
  assert.equal(hits[0]?.description, 'Python news')
})

test('parseChannelPosts keeps the newest previews', () => {
  const html = [1, 2, 3, 4, 5, 6]
    .map(
      (id) =>
        `data-post="telegram/${id}"><time datetime="2026-05-0${id}T00:00:00+00:00"></time><div class="js-message_text">Post ${id}</div>`,
    )
    .join('')
  const posts = parseChannelPosts(html, 'telegram')
  assert.deepEqual(
    posts.map((post) => post.id),
    ['6', '5', '4', '3', '2'],
  )
  assert.equal(posts[0]?.link, 'https://t.me/telegram/6')
})

test('extractHandle accepts usernames and t.me links only', () => {
  assert.equal(extractHandle('@telegram'), 'telegram')
  assert.equal(extractHandle('https://t.me/python'), 'python')
  assert.equal(extractHandle('python'), 'python')
  assert.equal(extractHandle('python news'), null)
  assert.equal(extractHandle('https://evil.example/telegram'), null)
})

test('scoreChat and dedupe prefer catalog metadata', () => {
  const catalogHit: Chat = {
    username: 'python',
    title: 'Python',
    description: 'A group about the Python programming language.',
    type: 'group',
    category: 'Community',
    language: 'en',
    members: 95000,
    online: 1000,
    verified: false,
    photo: null,
    link: 'https://t.me/python',
    source: 'catalog',
    live: false,
  }
  const indexHit: Chat = {
    ...catalogHit,
    description: '',
    category: 'Discovered',
    language: 'unknown',
    source: 'index',
    members: null,
  }
  assert.ok(scoreChat(catalogHit, 'python') >= 120)
  assert.equal(scoreChat(catalogHit, 'zzzz'), 0)

  const merged = dedupeScored([
    { ...indexHit, score: 40 },
    { ...catalogHit, score: 80 },
  ])
  assert.equal(merged.length, 1)
  assert.equal(merged[0]?.category, 'Community')
  assert.equal(merged[0]?.source, 'catalog')
  assert.equal(merged[0]?.description.includes('Python'), true)
})
