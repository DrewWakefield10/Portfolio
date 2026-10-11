const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { FAN_SPEEDS, nextFanSpeed, readFanPreferences, fanPlaybackRate, FanRotation } = require('../lib/fan.ts')

// Node has no animation frame APIs; the test replaces these browser-only functions.
global.requestAnimationFrame ??= () => 0
global.cancelAnimationFrame ??= () => {}

test('fan cycle, default Low and validated independent saved settings', () => {
  assert.deepEqual(FAN_SPEEDS, { off: 0, low: 60, medium: 120, high: 240 })
  let speed = 'off'
  const settings = []
  for (let i = 0; i < 5; i++) { speed = nextFanSpeed(speed); settings.push(speed) }
  assert.deepEqual(settings, ['low', 'medium', 'high', 'off', 'low'])
  for (const raw of [null, '{bad', 'null', '[]', '"high"', '{"one":"invalid"}']) {
    assert.deepEqual(readFanPreferences(raw, ['one', 'two']), { one: 'low', two: 'low' })
  }
  assert.deepEqual(readFanPreferences('{"one":"off","two":"high","old":"medium"}', ['one', 'two']), { one: 'off', two: 'high' })
  for (const [speed, rate] of [['off',0],['low',1],['medium',2],['high',4]]) {
    assert.equal(fanPlaybackRate(speed, false),rate)
    assert.equal(fanPlaybackRate(speed, true),rate/12)
  }
})

test('fan rate ramps smoothly, retargets rapid clicks and never writes the blade angle/timeline', t => {
  let sequence = 0
  const frames = new Map()
  t.mock.method(global, 'requestAnimationFrame', callback => { frames.set(++sequence,callback);return sequence })
  t.mock.method(global, 'cancelAnimationFrame', id => frames.delete(id))
  const frame = time => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach(callback => callback(time))
  }
  const animation = {
    playbackRate: 1,
    get currentTime() { return 1234 },
    set currentTime(_) { assert.fail('changing speed must not seek the timeline') },
    get startTime() { return 100 },
    set startTime(_) { assert.fail('changing speed must not reset the start time') },
    updatePlaybackRate(rate) { this.playbackRate = rate },
  }
  const controller = new FanRotation(animation)
  controller.setRate(4)
  frame(0)
  assert.equal(animation.playbackRate,1)
  frame(225)
  assert.equal(animation.playbackRate,2.5)
  controller.setRate(0)
  assert.equal(frames.size,1,'retargeting cancels the previous acceleration callback')
  frame(250)
  assert.equal(animation.playbackRate,2.5,'deceleration starts at the current speed')
  frame(475)
  assert.equal(animation.playbackRate,1.25)
  frame(700)
  assert.equal(animation.playbackRate,0)
  assert.equal(frames.size,0,'no JavaScript frame loop at steady speed or Off')
  controller.setRate(2,false)
  assert.equal(animation.playbackRate,2)
  assert.equal(frames.size,0,'restoring a preference applies its speed directly')
  controller.setRate(4)
  controller.dispose()
  assert.equal(frames.size,0)
  assert.equal(animation.currentTime,1234)
})

