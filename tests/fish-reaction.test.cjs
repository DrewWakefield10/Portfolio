const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { FishReaction } = require('../lib/fish-reaction.ts')
const scene = require('../lib/store-scene.json')
const centers = scene.fish.map(f => ({ x: f.x + f.width / 2, y: f.y + f.height / 2 }))
const zero = scene.fish.map(() => ({ x: 0, y: 0 }))

test('individual fish flee with staggered timing and independent 100–200x peaks in a one-second burst', () => {
  const model = new FishReaction(scene.fish, scene.tank)
  assert.equal(model.tap(0, { x: 1330, y: 550 }, centers), true)
  assert.equal(model.ends, 1000)
  assert.equal(model.state, 'startled')
  assert.ok(new Set(model.fish.map(f => f.delay)).size > 4)
  assert.ok(model.fish.every(f => f.delay >= 0 && f.delay <= 45))
  const samples = model.sample(250, 1 / 60, zero)
  assert.ok(samples.every(s => s.rate >= 100 && s.rate <= 200))
  assert.ok(new Set(samples.map(s => s.rate)).size > 4)
  assert.ok(samples.some(s => s.direction.x < 0) && samples.some(s => s.direction.x > 0))
  assert.ok(samples.some(s => s.direction.y < 0) && samples.some(s => s.direction.y > 0))
  const left = new FishReaction(scene.fish, scene.tank), right = new FishReaction(scene.fish, scene.tank)
  left.tap(0, { x: 1177, y: 540 }, centers)
  right.tap(0, { x: 1527, y: 540 }, centers)
  assert.ok(left.fish.every(f => f.target.x > 0))
  assert.ok(right.fish.every(f => f.target.x < 0))
})

test('recovery is gradual, offsets persist without a teleport, and new interactions vary predictably', () => {
  const model = new FishReaction(scene.fish, scene.tank)
  model.tap(0, { x: 1330, y: 550 }, centers)
  const first = model.fish.map(f => ({ ...f.target }))
  let previousRate = Infinity
  for (let now = 20; now <= 1000; now += 20) {
    const sample = model.sample(now, 0.02, zero)
    if (now >= 600) {
      assert.ok(sample[0].rate <= previousRate)
      previousRate = sample[0].rate
    }
  }
  assert.equal(model.state, 'idle')
  const settled = model.fish.map(f => ({ ...f.offset }))
  assert.ok(settled.some(p => Math.hypot(p.x, p.y) > 8))
  assert.ok(model.sample(1050, 0.02, zero).every(s => s.rate === 1))
  assert.deepEqual(model.fish.map(f => f.offset), settled, 'idle retains the recovered position')
  model.tap(1250, { x: 1330, y: 550 }, centers)
  assert.notDeepEqual(model.fish.map(f => f.target), first)
  assert.deepEqual(model.fish.map(f => f.offset), settled, 'a new tap does not reset positions')
})

test('tap storms cannot extend the one-second burst or exceed 200x speed or tank bounds', () => {
  const model = new FishReaction(scene.fish, scene.tank)
  const dt = 0.02
  const phase = scene.fish.map(() => 0)
  let sample = scene.fish.map(() => ({ rate: 1 }))
  model.tap(0, { x: 1177, y: 458 }, centers)
  for (let now = 20; now <= 1100; now += 20) {
    const base = scene.fish.map((f, i) => {
      const period = f.duration / 2.24
      phase[i] += dt * sample[i].rate / period
      const factor = Math.PI / period * Math.sin(phase[i] * Math.PI * 2) * sample[i].rate
      return { x: f.dx * factor, y: f.dy * factor }
    })
    if (now < 1000 && now % 200 === 0) model.tap(now, { x: now % 400 ? 1180 : 1520, y: 620 }, centers)
    sample = model.sample(now, dt, base)
    sample.forEach((s, i) => {
      const f = model.fish[i], b = f.bounds
      assert.ok(s.rate >= 1 && s.rate <= 200)
      assert.ok(Math.hypot(s.velocity.x, s.velocity.y) <= f.normalSpeed * 200 + 0.001)
      assert.ok(s.offset.x >= b.left && s.offset.x <= b.right && s.offset.y >= b.top && s.offset.y <= b.bottom)
    })
    assert.equal(model.ends, 1000)
  }
  assert.equal(model.state, 'idle')
  assert.ok(sample.every(s => s.rate === 1))
  assert.equal(model.tap(1100, { x: 1300, y: 550 }, centers), false, 'short rest after the hard cap')
  assert.equal(model.tap(1250, { x: 1300, y: 550 }, centers), true)
})

test('explicit burst speed also applies under reduced motion and cancellation restores normal rates', () => {
  const model = new FishReaction(scene.fish, scene.tank)
  model.tap(0, { x: 1300, y: 550 }, centers, true)
  for (let now = 20; now <= 700; now += 20) {
    const sample = model.sample(now, 0.02, zero)
    assert.ok(sample.every(s => s.rate <= 200))
    if (now === 260) assert.ok(sample.every(s => s.rate >= 100))
  }
  const offsets = model.fish.map(f => ({ ...f.offset }))
  model.finish(700)
  assert.ok(model.sample(800, 0.02, zero).every(s => s.rate === 1))
  assert.deepEqual(model.fish.map(f => f.offset), offsets)
})
