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
  constructor() { FakeContext.instances.push(this) }
  createGain() {
    const node = { gain: new Parameter(), disconnected: false, connect() {}, disconnect() { this.disconnected = true } }
    this.gains.push(node)
    return node
  }
  createOscillator() {
    const node = { frequency: new Parameter(), stops: [], connect() {}, disconnect() {}, start() {}, stop(time) { this.stops.push(time) } }
    this.oscillators.push(node)
    return node
  }
  resume() { this.state = 'running'; return Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
}
global.AudioContext = FakeContext

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
