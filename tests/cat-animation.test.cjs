const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }))
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { CAT_DURATION_MS, CAT_MEOW_AT_MS, catKeyframes } = require('../lib/cat-animation.ts')

test('six crisp poses hold drawings, synchronize mouth opening and remove ear motion when requested', () => {
  const frames = catKeyframes(false)
  assert.equal(frames.length, 7)
  assert.equal(frames[2].offset * CAT_DURATION_MS, CAT_MEOW_AT_MS)
  assert.ok(CAT_DURATION_MS >= 1000 && CAT_DURATION_MS <= 2000)
  assert.deepEqual(frames.slice(0, 6).map(frame => frame.backgroundPositionX), ['0%', '20%', '40%', '60%', '80%', '100%'])
  assert.ok(frames.slice(0, 6).every(frame => frame.easing === 'steps(1, end)'))
  assert.equal(catKeyframes(true)[1].backgroundPositionX, '0%')
})

test('both sheets retain source fur pixels, differ only at ears/mouth and return to identical idle', async () => {
  for (const theme of ['day', 'night']) {
    const directory = 'public/wallpapers/animation/cat/'
    const sheet = await sharp(directory + theme + '-meow.png').metadata()
    assert.equal(sheet.width, 252 * 6)
    assert.equal(sheet.height, 83)
    assert.equal(sheet.hasAlpha, true)
    const original = await sharp(`public/wallpapers/store-${theme}-master.png`)
      .extract({ left: 28, top: 682, width: 252, height: 83 }).ensureAlpha().raw().toBuffer()
    const frames = await Promise.all(Array.from({ length: 6 }, (_, i) => sharp(directory + theme + '-' + i + '.png').raw().toBuffer()))
    assert.deepEqual(frames[0], frames[5], 'final pose is pixel-identical to original idle')
    const hashes = new Set(frames.map(buffer => require('node:crypto').createHash('sha256').update(buffer).digest('hex')))
    assert.equal(hashes.size, 5, 'idle plus four actual drawings, not a moving static image')
    for (const [frame, buffer] of frames.entries()) {
      let changed = 0
      for (let i = 0; i < buffer.length; i += 4) {
        if (!buffer[i + 3]) continue
        if (!buffer.subarray(i, i + 3).equals(original.subarray(i, i + 3))) {
          const x = i / 4 % 252, y = Math.floor(i / 4 / 252)
          assert.ok((x >= 197 && x < 219 && y >= 60 && y <= 71) || (x >= 186 && x <= 190 && y >= 23 && y <= 30), `unexpected fur/body change at ${x},${y} in frame ${frame}`)
          changed++
        }
      }
      assert.equal(changed > 0, frame > 0 && frame < 5)
    }
  }
})
