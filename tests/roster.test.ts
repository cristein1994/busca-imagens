import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LABFERT_ROSTER } from '../data/labfert-roster.ts'
import { linkedinKind, rosterSummary, titleBand, unitFor } from '../lib/roster.ts'

describe('labfert roster', () => {
  it('keeps the pasted sheet and only the two emails', () => {
    const summary = rosterSummary(LABFERT_ROSTER)
    assert.equal(summary.rows, 31)
    assert.equal(summary.uniqueNames, 29)
    assert.equal(summary.emails, 2)
    assert.ok(summary.duplicates.length >= 2)
  })

  it('maps published units and linkedin token urls', () => {
    assert.equal(unitFor('Uberaba, Minas Gerais, Brazil'), 'Uberaba, Minas Gerais')
    assert.equal(unitFor('Portugal'), null)
    assert.equal(linkedinKind('https://www.linkedin.com/in/ACwAAC21cK4BxjGEZoxocEe-eclzimUHXoLOCu8'), 'token')
    assert.equal(linkedinKind('https://www.linkedin.com/in/fernando-borges-4497a9186'), 'slug')
    assert.equal(titleBand('Gerente Regional - Sul'), 'Liderança')
    assert.equal(titleBand('Analista de laboratório'), 'Analista')
  })
})
