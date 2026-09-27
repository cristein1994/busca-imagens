import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ahmiaHiddenFields, ddgNextFields, parseAhmia, parseDdg, unwrapDdgUrl } from '../lib/html.ts'
import { summarize } from '../lib/summarize.ts'
import { rejectQuery } from '../lib/guard.ts'

const DDG = `
<div class="result results_links results_links_deep result--ad ">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fads.example%2F">Ad</a>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fads.example%2F">buy now</a>
</div>
<div class="result results_links results_links_deep web-result ">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fosintframework.com%2F&amp;rut=abc">OSINT Framework</a>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fosintframework.com%2F">A public map of free OSINT tools for investigators and researchers.</a>
</div>
<div class="nav-link">
  <form action="/html/" method="post">
    <input type="submit" value="Next" />
    <input type="hidden" name="q" value="osint" />
    <input type="hidden" name="s" value="10" />
    <input type="hidden" name="vqd" value="4-1" />
  </form>
</div>
`

const AHMIA = `
<form id="searchForm" action="/search/" method="get">
  <input id="id_q" type="search" name="q">
  <input type="hidden" name="00594d" value="ce8b1e">
</form>
<li class="result">
  <h4><a href="/search/redirect?search_term=privacy&redirect_url=http://abc123def456abc123def456abc123def456abc123def456abc123def456.onion/privacy">Privacy policy</a></h4>
  <p>This service explains how public notes are stored and which data is not collected from readers.</p>
  <cite>abc123def456abc123def456abc123def456abc123def456abc123def456.onion</cite>
  <span class="lastSeen" data-timestamp="Sept. 1, 2026, 11:51 p.m.">3 weeks</span>
</li>
`

describe('parsers', () => {
  it('keeps organic DuckDuckGo hits and the next page form', () => {
    const rows = parseDdg(DDG)
    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.title, 'OSINT Framework')
    assert.equal(unwrapDdgUrl(rows[0]?.href ?? ''), 'https://osintframework.com/')
    assert.equal(ddgNextFields(DDG)?.s, '10')
  })

  it('reads Ahmia hidden fields and onion redirects', () => {
    assert.equal(ahmiaHiddenFields(AHMIA)['00594d'], 'ce8b1e')
    const hits = parseAhmia(AHMIA)
    assert.equal(hits.length, 1)
    assert.match(hits[0]?.url ?? '', /\.onion\/privacy$/)
    assert.match(hits[0]?.snippet ?? '', /public notes/)
  })

  it('builds a summary with the result count', () => {
    const summary = summarize('osint', [{
      title: 'OSINT Framework',
      url: 'https://osintframework.com/',
      displayUrl: 'osintframework.com',
      snippet: 'OSINT Framework is a website that helps people find free resources for investigations.',
      scrapedExcerpt: 'Investigators use public records, domain data, and news archives to cross-check a claim.',
      source: 'duckduckgo',
      lane: 'surface',
    }], 'Superfície')
    assert.match(summary.brief, /1 resultados/)
    assert.match(summary.brief, /public records/)
  })

  it('refuses credential-dump queries', () => {
    assert.equal(rejectQuery('open source intelligence'), null)
    assert.ok(rejectQuery('fullz shop'))
  })
})
