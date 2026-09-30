import { extractFromText, toE164, formatDisplay, toCsv } from './phones'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const e1 = toE164('11999990000')
assert(e1 === '+5511999990000', `BR mobile: ${e1}`)
assert(formatDisplay(e1!) === '+55 (11) 99999-0000', 'format BR')

const e2 = toE164('+55 21 98888-7777')
assert(e2 === '+5521988887777', `intl spaced: ${e2}`)

const pasted = `Maria Silva: (11) 98888-7777
5511999990000
João - +55 21 97777-6666
lixo sem numero
5511999990000`
const { items, duplicatesInBatch, ignored } = extractFromText(pasted)
assert(items.length === 3, `expected 3 items, got ${items.length}`)
assert(duplicatesInBatch >= 1, 'dup expected')
assert(ignored.some((i) => i.includes('lixo')), 'ignored line')

const csv = toCsv(items)
assert(csv.includes('e164'), 'csv header')
assert(csv.includes('+5511988887777') || csv.includes('+5511999990000'), 'csv body')

console.log('phones.selftest OK', { count: items.length, duplicatesInBatch })
