const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { spawnSync } = require('node:child_process')
const importer = path.resolve('scripts/sync-music.cjs')
const original = path.resolve('public/music.mp3')

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
  const available = spawnSync('ffprobe', ['-version'], { windowsHide: true })
  if (available.error || available.status !== 0) { t.skip('FFprobe unavailable'); return }
  const context = fixture(t, [entry])
  // Reuse the genuine supplied track solely as a temporary validation fixture.
  fs.copyFileSync(original, path.join(context.directory, 'public/music/day/test.mp3'))
  const result = context.run()
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(context.library(), [{ id: entry.id, title: entry.title, src: '/music/day/test.mp3', theme: 'light' }])
})
