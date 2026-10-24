const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')

function load({ send = async () => ({ status: 200 }), missing = false, blockedStorage = false } = {}) {
  const calls = [], warnings = [], saved = new Map()
  let now = 1_000_000
  const compiled = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync('lib/contact-message.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(source, {
    module: compiled, exports: compiled.exports,
    require: name => {
      assert.equal(name, '@emailjs/browser')
      return { __esModule: true, default: { send: (...args) => { calls.push(args); return send(...args) } } }
    },
    process: { env: missing ? { NODE_ENV: 'development' } : {
      NEXT_PUBLIC_EMAILJS_SERVICE_ID: 'service_test', NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: 'template_test', NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: 'public_test',
    } },
    console: { error: message => warnings.push(message) },
    Date: class extends Date { static now() { return now } },
    window: { localStorage: {
      getItem: key => { if (blockedStorage) throw Error('Blocked'); return saved.get(key) ?? null },
      setItem: (key, value) => { if (blockedStorage) throw Error('Blocked'); saved.set(key, value) },
    } },
  })
  return { ...compiled.exports, calls, warnings, saved, advance: ms => { now += ms } }
}
const fields = { email: 'visitor@example.com', message: 'Hello from a portfolio visitor.', website: '' }

test('rejects empty/invalid/overlong emails and out-of-range or whitespace-only messages', () => {
  const { validateContactMessage: validate } = load()
  for (const email of ['', ' ', 'visitor', 'a@@example.com', 'x'.repeat(243) + '@example.com']) {
    assert.ok(validate({ ...fields, email }).errors.email)
  }
  for (const message of ['', ' '.repeat(20), '123456789', 'x'.repeat(5001)]) {
    assert.ok(validate({ ...fields, message }).errors.message)
  }
  for (const message of ['x'.repeat(10), 'x'.repeat(5000)]) {
    assert.equal(Object.keys(validate({ ...fields, message }).errors).length, 0)
  }
  assert.equal(Object.keys(validate({ ...fields, email: 'x'.repeat(242) + '@example.com' }).errors).length, 0)
})

test('normalizes outer whitespace, preserves message content, and detects honeypot', () => {
  const { validateContactMessage: validate } = load()
  const result = validate({ ...fields, email: ` ${fields.email} `, message: '  Hello\n<test> & welcome!  ' })
  assert.equal(result.email, fields.email)
  assert.equal(result.message, 'Hello\n<test> & welcome!')
  assert.equal(result.blocked, false)
  assert.equal(validate({ ...fields, website: 'spam' }).blocked, true)
})

test('passes only the exact template variables, public configuration and SDK throttle', async () => {
  const api = load()
  await api.sendContactMessage(fields.email, fields.message)
  assert.deepEqual(JSON.parse(JSON.stringify(api.calls[0])), ['service_test', 'template_test', {
    from_name: 'Portfolio Visitor', reply_to: fields.email, message: fields.message,
  }, { publicKey: 'public_test', limitRate: { id: 'portfolio-contact', throttle: 10000 } }])
  assert.equal(api.saved.size, 1)
  assert.equal([...api.saved.values()][0], '1000000', 'only the successful timestamp is persisted')
})

test('locks concurrent sends, then enforces a 30-second successful-send cooldown', async () => {
  let finish
  const api = load({ send: () => new Promise(resolve => { finish = resolve }) })
  const first = api.sendContactMessage(fields.email, fields.message)
  await assert.rejects(api.sendContactMessage(fields.email, fields.message), { code: 'pending' })
  assert.equal(api.calls.length, 1)
  finish({ status: 200 })
  await first
  await assert.rejects(api.sendContactMessage(fields.email, fields.message), { code: 'cooldown' })
  api.advance(30_000)
  const next = api.sendContactMessage(fields.email, fields.message)
  assert.equal(api.calls.length, 2)
  finish({ status: 200 })
  await next
})

test('failed requests release the lock and do not create a successful-send cooldown', async () => {
  const api = load({ send: async () => { throw Error('Provider failure') } })
  await assert.rejects(api.sendContactMessage(fields.email, fields.message))
  await assert.rejects(api.sendContactMessage(fields.email, fields.message))
  assert.equal(api.calls.length, 2)
  assert.equal(api.saved.size, 0)
})

test('missing configuration prevents the request and gives a development hint', async () => {
  const api = load({ missing: true })
  await assert.rejects(api.sendContactMessage(fields.email, fields.message), { code: 'configuration' })
  assert.equal(api.calls.length, 0)
  assert.match(api.warnings[0], /NEXT_PUBLIC_EMAILJS_SERVICE_ID/)
})

test('success and in-memory cooldown work when storage is unavailable', async () => {
  const api = load({ blockedStorage: true })
  await api.sendContactMessage(fields.email, fields.message)
  await assert.rejects(api.sendContactMessage(fields.email, fields.message), { code: 'cooldown' })
  assert.equal(api.calls.length, 1)
})

test('restored timestamps enforce cooldown; invalid or future timestamps do not lock the form', async () => {
  const api = load()
  api.saved.set('portfolio-contact-last-success', '999999')
  await assert.rejects(api.sendContactMessage(fields.email, fields.message), { code: 'cooldown' })
  for (const value of ['invalid', 'Infinity', '2000000']) {
    const fresh = load()
    fresh.saved.set('portfolio-contact-last-success', value)
    await fresh.sendContactMessage(fields.email, fields.message)
    assert.equal(fresh.calls.length, 1)
  }
})
