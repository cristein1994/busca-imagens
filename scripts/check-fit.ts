import assert from 'node:assert/strict'
import { assess, parseMm, withCase } from '../src/lib/fit.ts'

const proMax = { widthMm: 78, heightMm: 163.4, depthMm: 8.75 }
const bag = assess(proMax, { widthMm: 440, heightMm: 500, depthMm: 220 }, 4)
assert.equal(bag.status, 'fits')
const widthMargin = bag.axes.find((axis) => axis.axis === 'widthMm')?.marginMm ?? 0
assert.ok(widthMargin > 300)

const blocked = assess(proMax, { widthMm: 70, heightMm: 150, depthMm: 20 }, 4)
assert.equal(blocked.status, 'no')

const snug = assess(
  { widthMm: 70, heightMm: 140, depthMm: 10 },
  { widthMm: 72, heightMm: 160, depthMm: 20 },
  4,
)
assert.equal(snug.status, 'tight')

const unknown = assess(proMax, { widthMm: null, heightMm: null, depthMm: null }, 4)
assert.equal(unknown.status, 'unknown')

assert.deepEqual(withCase(proMax, 1.5), {
  widthMm: 81,
  heightMm: 166.4,
  depthMm: 11.75,
})

assert.deepEqual(parseMm(''), { state: 'empty' })
assert.deepEqual(parseMm('78,5'), { state: 'ok', value: 78.5 })
assert.deepEqual(parseMm('0'), { state: 'invalid' })
assert.deepEqual(parseMm('abc'), { state: 'invalid' })

console.log('fit checks ok')
