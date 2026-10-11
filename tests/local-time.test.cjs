const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { calendarMonth, clockAngles, localDateKey, localClock } = require('../lib/local-time.ts')

test('local calendar handles leap days, century exceptions, weekday alignment and year boundaries', () => {
  const leap = calendarMonth(new Date(2024, 1, 29))
  assert.deepEqual(leap.slice(0, 7), [null, null, null, null, 1, 2, 3])
  assert.equal(leap.filter(Boolean).length, 29)
  assert.equal(calendarMonth(new Date(2100, 1, 1)).filter(Boolean).length, 28)
  assert.equal(calendarMonth(new Date(2000, 1, 1)).filter(Boolean).length, 29)
  const october = calendarMonth(new Date(2026, 9, 12))
  assert.equal(october.length, 35)
  assert.equal(october.indexOf(12) % 7, 1, 'October 12, 2026 is Monday')
  assert.equal(calendarMonth(new Date(2026, 4, 1)).length, 42)
  assert.equal(calendarMonth(new Date(2026, 7, 1)).length, 42)
  assert.equal(localDateKey(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31')
  assert.equal(localDateKey(new Date(2027, 0, 1)), '2027-01-01')
})

test('wall clock angles include seconds and use local hours', () => {
  assert.deepEqual(clockAngles(new Date(2026, 9, 12, 6, 30, 30)), { hour: 195.25, minute: 183 })
  assert.deepEqual(clockAngles(new Date(2026, 9, 12, 18, 30, 30)), { hour: 195.25, minute: 183 })
  assert.deepEqual(clockAngles(new Date(2027, 0, 1)), { hour: 0, minute: 0 })
})

test('one shared clock crosses local midnight, pauses hidden, resynchronizes and cleans up the last subscription', t => {
  const originalDocument = global.document
  const doc = new EventTarget()
  doc.hidden = false
  global.document = doc
  const start = new Date(2026, 11, 31, 23, 59, 59, 800).getTime()
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: start })
  let a = 0, b = 0
  let stopA, stopB
  try {
    assert.equal(localClock.getServerSnapshot(), null)
    stopA = localClock.subscribe(() => a++)
    stopB = localClock.subscribe(() => b++)
    assert.equal(localClock.getSnapshot(), start)
    t.mock.timers.tick(200)
    assert.equal(localDateKey(new Date(localClock.getSnapshot())), '2027-01-01')
    assert.equal(a, 2)
    assert.equal(b, 1, 'both subscribers share exactly one second tick')
    stopA()
    t.mock.timers.tick(1000)
    assert.equal(a, 2)
    assert.equal(b, 2)
    doc.hidden = true
    doc.dispatchEvent(new Event('visibilitychange'))
    const frozen = localClock.getSnapshot(), count = b
    t.mock.timers.tick(90000)
    assert.equal(localClock.getSnapshot(), frozen)
    assert.equal(b, count)
    doc.hidden = false
    doc.dispatchEvent(new Event('visibilitychange'))
    assert.equal(localClock.getSnapshot(), Date.now(), 'visible tabs synchronize immediately')
    assert.equal(b, count + 1)
    stopB()
    assert.equal(localClock.getSnapshot(), null)
    t.mock.timers.tick(5000)
    doc.dispatchEvent(new Event('visibilitychange'))
    assert.equal(b, count + 1, 'no remaining timer or visibility listener')
  } finally {
    stopA?.()
    stopB?.()
    global.document = originalDocument
  }
})
