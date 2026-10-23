const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { UiSounds, UI_TONES, hoverSoundKind } = require('../lib/ui-sounds.ts')

class Parameter {
  value = 0
  events = []
  setValueAtTime(value, time) { this.value = value; this.events.push({ value, time }) }
  exponentialRampToValueAtTime(value, time) { this.events.push({ value, time }) }
  setTargetAtTime(value, time, constant) { this.events.push({ value, time, constant }) }
  cancelScheduledValues() {}
}
class FakeContext {
  static instances = []
  state = 'running'
  currentTime = 0
  destination = {}
  oscillators = []
  gains = []
  buffers = []
  decodeAudioData() { return Promise.resolve({ duration: 1.12 }) }
  createBufferSource() {
    const node = { starts: [], stops: [], connect() {}, disconnected: false,
      disconnect() { this.disconnected = true },
      start(time) { this.starts.push(time) }, stop(time) { this.stops.push(time) } }
    this.buffers.push(node)
    return node
  }
  constructor() { FakeContext.instances.push(this) }
  createGain() {
    const node = { gain: new Parameter(), disconnected: false, connect() {}, disconnect() { this.disconnected = true } }
    this.gains.push(node)
    return node
  }
  createOscillator() {
    const node = { frequency: new Parameter(), starts: [], stops: [], connect() {}, disconnect() {}, start(time) { this.starts.push(time) }, stop(time) { this.stops.push(time) } }
    this.oscillators.push(node)
    return node
  }
  resume() { this.state = 'running'; return Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
}
global.AudioContext = FakeContext

test('bubble sounds use three staggered rising bloops, a 200ms cooldown and shared voice cleanup', () => {
  const sounds = new UiSounds()
  sounds.unlock()
  const context = FakeContext.instances.at(-1)
  sounds.play('bubble')
  assert.equal(context.oscillators.length, 3)
  assert.ok(context.oscillators.every(o => o.type === 'sine'))
  assert.deepEqual(context.oscillators.map(o => o.starts[0]), [0, 0.075, 0.16])
  assert.ok(context.oscillators.every(o => o.frequency.events[1].value > o.frequency.value), 'each bubble rises in pitch')
  context.currentTime = 0.19
  sounds.play('bubble')
  assert.equal(context.oscillators.length, 3)
  context.currentTime = 0.21
  sounds.play('bubble')
  assert.equal(context.oscillators.length, 6)
  for (const tone of UI_TONES.bubble) {
    assert.ok(tone.duration <= 0.35)
    assert.ok(tone.peak * 2 < Math.min(...UI_TONES.click.map(t => t.peak)))
  }
  sounds.silence()
  assert.equal(context.gains[4].gain.events.at(-1).value, 0.0001)
  assert.equal(context.gains[4].gain.events.at(-1).constant, 0.002)
  context.oscillators.forEach(o => o.onended())
  assert.ok(context.gains.every(g => g.disconnected))
  sounds.dispose()
})

test('recorded meow decodes once in the shared context, schedules once and cancels pending audio on mute/dispose', async () => {
  const originalFetch = global.fetch
  let requests = 0
  global.fetch = async () => { requests++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) } }
  try {
    const sounds = new UiSounds()
    const before = FakeContext.instances.length
    sounds.preloadMeow()
    assert.equal(FakeContext.instances.length, before, 'preloading does not unlock audio or create a context')
    await sounds.prepareMeow()
    await sounds.prepareMeow()
    const context = FakeContext.instances.at(-1)
    context.currentTime = 4
    sounds.playMeow(0.28)
    sounds.playMeow(0.28)
    assert.equal(requests, 1)
    assert.equal(FakeContext.instances.length, before + 1)
    assert.equal(context.buffers.length, 1, 'repeated requests never overlap meows')
    assert.deepEqual(context.buffers[0].starts, [4.28], 'sound starts on mouth opening')
    assert.equal(context.gains[0].gain.value, 0.25)
    sounds.silence()
    assert.deepEqual(context.buffers[0].stops, [4.02], 'muting cancels a source before its scheduled start')
    context.buffers[0].onended()
    assert.equal(context.buffers[0].disconnected, true)
    context.currentTime = 6
    sounds.playMeow(0.28)
    assert.equal(context.buffers.length, 2)
    sounds.dispose()
    sounds.playMeow(0)
    assert.equal(context.buffers.length, 2)
    assert.equal(context.state, 'closed')
  } finally { global.fetch = originalFetch }
})

test('unavailable meow audio fails quietly without blocking other UI sounds', async () => {
  const originalFetch = global.fetch
  global.fetch = async () => { throw Error('offline') }
  try {
    const sounds = new UiSounds()
    await sounds.prepareMeow()
    const context = FakeContext.instances.at(-1)
    sounds.playMeow(0.28)
    assert.equal(context.buffers.length, 0)
    sounds.play('zap')
    assert.equal(context.oscillators.length, 1)
    sounds.dispose()
  } finally { global.fetch = originalFetch }
})

test('zaps sweep down quietly, bypass hover throttling and release rather than stack', () => {
  const sounds = new UiSounds()
  sounds.play('zap')
  sounds.unlock()
  const context = FakeContext.instances.at(-1)
  sounds.play('hover')
  context.currentTime = 0.01
  sounds.playFromGesture('zap')
  assert.equal(context.oscillators.length, 2, 'a preceding hover must not swallow the zap')
  const zap = context.oscillators[1]
  assert.equal(zap.type, 'sawtooth')
  assert.equal(zap.frequency.events[1].value, UI_TONES.zap[0].end)
  assert.ok(context.oscillators[0].stops.some(time => Math.abs(time - 0.018) < 0.0001))
  sounds.play('zap')
  assert.equal(context.oscillators.length, 2, 'rapid repeat activations are throttled')
  for (const time of [0.12, 0.24]) { context.currentTime = time; sounds.play('zap') }
  assert.deepEqual(context.oscillators.slice(1).map(node => node.frequency.value), UI_TONES.zap.map(tone => tone.start))
  for (const tone of UI_TONES.zap) {
    assert.ok(tone.start > tone.end * 10, 'steep pitch drop makes an electrical zap')
    assert.ok(tone.duration <= 0.1)
    assert.ok(tone.peak < Math.min(...UI_TONES.click.map(item => item.peak)))
  }
  sounds.silence()
  assert.equal(context.gains.at(-1).gain.events.at(-1).value, 0.0001)
  sounds.dispose()
  sounds.playFromGesture('zap')
  assert.equal(context.oscillators.length, 4)
})

test('a gesture waits for suspended audio and mute cancels pending feedback', async () => {
  const sounds = new UiSounds()
  sounds.unlock()
  const context = FakeContext.instances.at(-1)
  context.state = 'suspended'
  let resume
  context.resume = () => new Promise(resolve => { resume = () => { context.state = 'running'; resolve() } })
  sounds.playFromGesture('click')
  assert.equal(context.oscillators.length, 0)
  resume()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(context.oscillators.length, 1)
  context.state = 'suspended'
  context.currentTime = 1
  sounds.playFromGesture('click')
  sounds.silence()
  resume()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(context.oscillators.length, 1)
  sounds.dispose()
})

test('three hover and click variants have restrained gains and short envelopes', () => {
  for (const tones of Object.values(UI_TONES)) assert.equal(tones.length, 3)
  for (const tone of UI_TONES.hover) {
    assert.ok(tone.duration >= 0.04 && tone.duration <= 0.12)
    assert.ok(tone.peak < Math.min(...UI_TONES.click.map(item => item.peak)))
  }
  for (const tone of UI_TONES.click) {
    assert.ok(tone.duration >= 0.05 && tone.duration <= 0.18)
    assert.ok(tone.peak < 0.1)
  }
})

test('tones wait for unlock, rotate variants, throttle repeats and release prior voices', () => {
  const sounds = new UiSounds()
  sounds.play('hover')
  sounds.unlock()
  const context = FakeContext.instances.at(-1)
  sounds.play('hover')
  sounds.play('hover')
  assert.equal(context.oscillators.length, 1)
  for (const time of [0.11, 0.22]) { context.currentTime = time; sounds.play('hover') }
  assert.deepEqual(context.oscillators.map(node => node.frequency.value), UI_TONES.hover.map(item => item.start))
  context.currentTime = 0.23
  sounds.play('click')
  sounds.play('click')
  context.currentTime = 0.24
  sounds.play('hover')
  assert.equal(context.oscillators.length, 4)
  assert.ok(context.oscillators[2].stops.some(time => Math.abs(time - 0.238) < 0.0001))
  context.oscillators.forEach(node => node.onended())
  assert.ok(context.gains.every(node => node.disconnected))
  sounds.dispose()
  assert.equal(context.state, 'closed')
  sounds.unlock()
  assert.equal(FakeContext.instances.at(-1), context)
})

test('skill blips are distinct, quiet and share hover throttling and voice release', () => {
  const sounds = new UiSounds()
  sounds.unlock()
  const context = FakeContext.instances.at(-1)
  sounds.play('skill')
  assert.equal(context.oscillators[0].type, 'triangle')
  assert.equal(context.oscillators[0].frequency.value, UI_TONES.skill[0].start)
  sounds.play('hover')
  sounds.play('skill')
  assert.equal(context.oscillators.length, 1, 'shared throttle avoids layered hover sounds')
  for (const time of [0.1, 0.2]) { context.currentTime = time; sounds.play('skill') }
  assert.deepEqual(context.oscillators.map(node => node.frequency.value), UI_TONES.skill.map(tone => tone.start))
  assert.ok(context.oscillators[0].stops.some(time => Math.abs(time - 0.108) < 0.0001), 'previous voice releases within 8ms')
  for (const tone of UI_TONES.skill) {
    assert.ok(tone.duration >= 0.04 && tone.duration <= 0.12)
    assert.ok(tone.peak < Math.min(...UI_TONES.hover.map(item => item.peak)))
  }
  context.currentTime = 0.3
  sounds.play('click')
  context.currentTime = 0.31
  sounds.play('skill')
  assert.equal(context.oscillators.length, 4, 'click suppresses immediate hover feedback')
  sounds.dispose()
})

test('light-switch tones are quiet, distinct activations and respect click throttling', () => {
  const sounds = new UiSounds()
  sounds.unlock()
  const context = FakeContext.instances.at(-1)
  sounds.play('switch')
  assert.equal(context.oscillators[0].type, 'triangle')
  assert.equal(context.oscillators[0].frequency.value, UI_TONES.switch[0].start)
  sounds.play('click')
  context.currentTime = 0.02
  sounds.play('switch')
  context.currentTime = 0.03
  sounds.play('hover')
  assert.equal(context.oscillators.length, 1)
  context.currentTime = 0.1
  sounds.play('switch')
  assert.equal(context.oscillators.length, 2)
  for (const tone of UI_TONES.switch) {
    assert.ok(tone.duration >= 0.05 && tone.duration <= 0.15)
    assert.ok(tone.peak < Math.min(...UI_TONES.click.map(item => item.peak)))
  }
  sounds.dispose()
})

test('phone, clock and paper feedback remain quiet, use hover throttling and release the shared voice', () => {
  const sounds = new UiSounds()
  sounds.unlock()
  const context = FakeContext.instances.at(-1)
  for (const [index, kind] of ['phone', 'clock', 'paper'].entries()) {
    context.currentTime = index * 0.2
    sounds.play(hoverSoundKind(kind))
    assert.equal(context.oscillators.length, index + 1)
    assert.equal(context.oscillators[index].frequency.value, UI_TONES[kind][0].start)
    assert.equal(context.oscillators[index].type, kind === 'clock' ? 'sine' : 'triangle')
    sounds.play('hover')
    assert.equal(context.oscillators.length, index + 1, 'object feedback uses shared hover debounce')
    for (const tone of UI_TONES[kind]) {
      assert.ok(tone.duration > 0 && tone.duration <= 0.1)
      assert.ok(tone.peak < Math.min(...UI_TONES.hover.map(item => item.peak)))
    }
  }
  assert.ok(context.oscillators[0].stops.some(time => Math.abs(time - 0.208) < 0.0001))
  assert.equal(hoverSoundKind('click'), 'hover', 'hover attributes cannot bypass activation throttling')
  sounds.dispose()
})

test('fan switch ticks share activation throttling, release and low-volume feedback', () => {
  const sounds = new UiSounds()
  sounds.unlock()
  const context = FakeContext.instances.at(-1)
  sounds.play('fan')
  assert.equal(context.oscillators[0].type,'triangle')
  context.currentTime = 0.02
  sounds.play('fan')
  sounds.play('click')
  context.currentTime = 0.1
  sounds.play('hover')
  assert.equal(context.oscillators.length,1)
  context.currentTime = 0.2
  sounds.play('fan')
  assert.equal(context.oscillators.length,2)
  assert.ok(context.oscillators[0].stops.some(time => Math.abs(time-0.208)<0.0001))
  for (const tone of UI_TONES.fan) {
    assert.ok(tone.duration>=0.05&&tone.duration<=0.12)
    assert.ok(tone.peak<Math.min(...UI_TONES.hover.map(item=>item.peak)))
  }
  sounds.dispose()
})
