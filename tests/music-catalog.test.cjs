const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawnSync } = require('node:child_process')
const importer = path.resolve('scripts/sync-music.cjs')
const original = path.resolve('public/music.mp3')
const { verifyMaster, suppliedTrackGain } = require('../scripts/music-audio.cjs')

function fixture(t, catalog) {
  const parent = fs.realpathSync(os.tmpdir())
  const directory = fs.mkdtempSync(path.join(parent, 'portfolio-music-test-'))
  fs.mkdirSync(path.join(directory, 'public/music/day'), { recursive: true })
  fs.mkdirSync(path.join(directory, 'lib'))
  fs.writeFileSync(path.join(directory, 'public/music/catalog.json'), JSON.stringify(catalog))
  t.after(() => {
    // Verify the absolute, uniquely-created target before recursive cleanup.
    const resolved = fs.realpathSync(directory)
    assert.equal(path.dirname(resolved), parent)
    assert.ok(path.basename(resolved).startsWith('portfolio-music-test-'))
    fs.rmSync(resolved, { recursive: true })
  })
  return {
    directory,
    run: () => spawnSync(process.execPath, [importer], { cwd: directory, encoding: 'utf8', windowsHide: true }),
    library: () => JSON.parse(fs.readFileSync(path.join(directory, 'lib/music-library.json'), 'utf8')),
  }
}
const entry = { id: 'test-track', title: 'Test track', theme: 'light', file: 'day/test.mp3', status: 'ready' }

function needsFFmpeg(t) {
  for (const command of ['ffmpeg', 'ffprobe']) {
    const available = spawnSync(command, ['-version'], { windowsHide: true })
    if (available.error || available.status !== 0) { t.skip(command + ' unavailable'); return false }
  }
  return true
}

test('planned music is excluded without touching unavailable audio files', t => {
  const context = fixture(t, [{ ...entry, status: 'planned' }])
  assert.equal(context.run().status, 0)
  assert.deepEqual(context.library(), [])
})

test('missing and escaping audio paths cannot be activated', t => {
  const context = fixture(t, [entry])
  assert.notEqual(context.run().status, 0)
  fs.writeFileSync(path.join(context.directory, 'public/music/catalog.json'), JSON.stringify([{ ...entry, file: '../../../music.mp3' }]))
  assert.notEqual(context.run().status, 0)
  assert.equal(fs.existsSync(path.join(context.directory, 'lib/music-library.json')), false)
})

test('real existing audio is decoded and exported with validated metadata', t => {
  if (!needsFFmpeg(t)) return
  const context = fixture(t, [entry])
  // Reuse the genuine supplied track solely as a temporary validation fixture.
  fs.copyFileSync(original, path.join(context.directory, 'public/music/day/test.mp3'))
  const result = context.run()
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(context.library(), [{ id: entry.id, title: entry.title, src: '/music/day/test.mp3', theme: 'light' }])
})

test('the supplied catalog matches real files and assigns four songs to each folder theme', () => {
  const catalog = require('../public/music/catalog.json')
  const library = require('../lib/music-library.json')
  assert.equal(catalog.length, 8)
  assert.equal(new Set(catalog.map(value => value.id)).size, 8)
  assert.equal(new Set(library.map(value => value.src)).size, 8)
  for (const [theme, folder] of [['light', 'day'], ['dark', 'night']]) {
    const entries = catalog.filter(value => value.theme === theme)
    assert.equal(entries.length, 4)
    for (const value of entries) {
      assert.equal(value.status, 'ready')
      assert.equal(value.collection, 'user-supplied')
      assert.ok(value.file.startsWith(folder + '/'))
      assert.ok(fs.statSync(path.resolve('public/music', value.file)).size > 1024)
      const active = library.find(track => track.id === value.id)
      assert.ok(active && active.gain > 0 && active.gain <= 1)
      assert.equal(decodeURIComponent(active.src), '/music/' + value.file)
    }
  }
})

test('supplied songs get safe attenuation while preserving quiet masters and natural lengths', () => {
  const measured = { durationSeconds: 342, integratedLufs: -10, truePeakDbtp: 2.4, silence: [{ end: 342, duration: 3.3 }] }
  const gain = suppliedTrackGain(measured, 'supplied.mp3')
  assert.ok(Math.abs(measured.integratedLufs + 20 * Math.log10(gain) + 24) < 0.001)
  assert.ok(measured.truePeakDbtp + 20 * Math.log10(gain) <= -2)
  assert.equal(suppliedTrackGain({ ...measured, integratedLufs: -26, truePeakDbtp: -8 }, 'quiet.mp3'), 1)
  assert.throws(() => suppliedTrackGain({ ...measured, integratedLufs: -Infinity }, 'silent.mp3'), /Silent or unmeasurable/)
})

test('long supplied songs with spaces and apostrophes import without truncation or renaming', t => {
  if (!needsFFmpeg(t)) return
  const supplied = { ...entry, collection: 'user-supplied', file: "day/when you're ready.mp3" }
  const context = fixture(t, [supplied])
  // Stream-copy a repeated reference only into this disposable test fixture.
  const generated = spawnSync('ffmpeg', ['-v', 'error', '-stream_loop', '1', '-i', original, '-c:a', 'copy',
    path.join(context.directory, 'public/music', supplied.file)], { windowsHide: true })
  assert.equal(generated.status, 0)
  const result = context.run()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /23[0-9]\.\ds/)
  assert.equal(context.library()[0].src, "/music/day/when%20you're%20ready.mp3")
  assert.ok(context.library()[0].gain > 0 && context.library()[0].gain <= 1)
})

test('quality checks reject excessive true peaks and long silence even at the correct integrated level', () => {
  const measured = { durationSeconds: 150, integratedLufs: -24, truePeakDbtp: -8, silence: [] }
  assert.doesNotThrow(() => verifyMaster(measured, 'master.mp3'))
  assert.throws(() => verifyMaster({ ...measured, truePeakDbtp: -0.2 }, 'master.mp3'), /True peak exceeds/)
  assert.throws(() => verifyMaster({ ...measured, silence: [{ end: 50, duration: 12 }] }, 'master.mp3'), /seconds of silence/)
})

test('undecodable ready files do not replace the previously verified library', t => {
  const context = fixture(t, [entry])
  const saved = [{ id: 'previously-verified' }]
  fs.writeFileSync(path.join(context.directory, 'lib/music-library.json'), JSON.stringify(saved))
  fs.writeFileSync(path.join(context.directory, 'public/music/day/test.mp3'), Buffer.alloc(2048, 42))
  assert.notEqual(context.run().status, 0)
  assert.deepEqual(context.library(), saved)
})

test('valid but silent audio is rejected instead of activating a placeholder', t => {
  if (!needsFFmpeg(t)) return
  const context = fixture(t, [entry])
  const file = path.join(context.directory, 'public/music/day/test.mp3')
  // Synthetic silence is solely a temporary negative-test fixture, never a song.
  const generated = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', '125', '-c:a', 'libmp3lame', '-b:a', '64k', file], { windowsHide: true })
  assert.equal(generated.status, 0)
  const result = context.run()
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Silent or unmeasurable audio/)
  assert.equal(fs.existsSync(path.join(context.directory, 'lib/music-library.json')), false)
})

test('an unexpectedly loud master is rejected without changing the original', t => {
  if (!needsFFmpeg(t)) return
  const context = fixture(t, [entry])
  const file = path.join(context.directory, 'public/music/day/test.mp3')
  // Re-encode only a disposable fixture; never overwrite the supplied asset.
  const generated = spawnSync('ffmpeg', ['-v', 'error', '-i', original, '-af', 'volume=8dB',
    '-c:a', 'libmp3lame', '-b:a', '128k', file], { windowsHide: true })
  assert.equal(generated.status, 0)
  const result = context.run()
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Master must measure -24 LUFS/)
  assert.equal(fs.existsSync(path.join(context.directory, 'lib/music-library.json')), false)
})
