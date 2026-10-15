const assert = require('node:assert/strict')
const fs = require('node:fs')
const test = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename)
}
global.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 1)
global.cancelAnimationFrame = clearTimeout
const { MusicPlayer } = require('../lib/music-player.ts')
const { MusicRotation } = require('../lib/music-rotation.ts')
const { adjacentTrack, readAudioPreferences, AUDIO_STORAGE_KEY, MUSIC_MAX_GAIN } = require('../lib/music.ts')
const wait = (ms = 5) => new Promise(resolve => setTimeout(resolve, ms))
const track = (id, theme = 'light', src = '/' + id + '.mp3') => ({ id, title: id, src, theme })
const playlists = {
  light: [track('a'), track('b'), track('c')],
  dark: [track('x', 'dark'), track('y', 'dark')],
}
class FakeAudio extends EventTarget {
  paused = true
  volume = 1
  muted = false
  src = ''
  preload = ''
  loop = false
  currentTime = 0
  error = null
  plays = 0
  loads = 0
  playError = null
  play() {
    this.plays++
    if (this.playError) return Promise.reject(this.playError)
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    if (!this.paused) { this.paused = true; this.dispatchEvent(new Event('pause')) }
  }
  load() { this.loads++; this.currentTime = 0; this.pause(); this.error = null }
  removeAttribute(name) { if (name === 'src') this.src = '' }
}
function setup(preferences = {}, options = {}) {
  let value = JSON.stringify(preferences)
  const storage = { getItem: () => value, setItem: (_key, next) => { value = next } }
  const audio = new FakeAudio()
  const player = new MusicPlayer({ playlists, transitionMs: 0, ...options })
  player.connect(audio, 'light', storage)
  return { player, audio, saved: () => JSON.parse(value) }
}

test('preferences validate malformed, stale and blocked storage', () => {
  assert.equal(readAudioPreferences({ getItem: () => '{' }).enabled, false)
  assert.equal(readAudioPreferences({ getItem: () => { throw Error('blocked') } }).volume, 0.5)
  const prefs = readAudioPreferences({ getItem: () => JSON.stringify({ volume: 9, enabled: 'true', selected: { light: 12 } }) })
  assert.equal(prefs.volume, 1)
  assert.equal(prefs.enabled, false)
  assert.equal(typeof prefs.selected.light, 'string')
  assert.equal(AUDIO_STORAGE_KEY, 'portfolio-audio-v1')
})

test('sequential and shuffled navigation handles empty and single-track playlists', () => {
  assert.equal(adjacentTrack(playlists.light, 'c', 1, false).id, 'a')
  assert.equal(adjacentTrack(playlists.light, 'a', -1, false).id, 'c')
  assert.equal(adjacentTrack(playlists.light, 'b', 1, true, () => 0).id, 'a')
  assert.equal(adjacentTrack([], 'a', 1, false), undefined)
  assert.equal(adjacentTrack([playlists.light[0]], 'a', 1, true).id, 'a')
})

test('mount never autoplays; play/pause persists intent and keeps a single media resource', async () => {
  const { player, audio, saved } = setup({ enabled: true, selected: { light: 'b' } })
  assert.equal(audio.plays, 0)
  assert.equal(player.getSnapshot().pending, true)
  assert.equal(audio.src, '/b.mp3')
  player.play()
  await wait()
  assert.equal(player.getSnapshot().playing, true)
  assert.equal(saved().enabled, true)
  player.pause()
  assert.equal(saved().enabled, false)
  assert.equal(audio.paused, true)
  const loads = audio.loads
  player.getSnapshot(); player.getSnapshot()
  assert.equal(audio.loads, loads)
  player.disconnect()
  assert.equal(audio.src, '')
})

test('paused theme changes restore separate last selections without starting playback', async () => {
  const { player, audio, saved } = setup({ selected: { light: 'b', dark: 'y' } })
  await player.setTheme('dark')
  assert.equal(audio.src, '/y.mp3')
  await player.setTheme('light')
  assert.equal(audio.src, '/b.mp3')
  assert.equal(audio.plays, 0)
  assert.equal(saved().selected.dark, 'y')
  player.disconnect()
})

test('playing theme switch fades down before loading, then fades up on the same audio element', async () => {
  const { player, audio } = setup({}, { transitionMs: 40 })
  player.play()
  await wait()
  const transition = player.setTheme('dark')
  assert.equal(audio.src, '/a.mp3')
  await transition
  assert.equal(audio.src, '/x.mp3')
  assert.equal(audio.paused, false)
  assert.equal(audio.volume, MUSIC_MAX_GAIN * 0.5)
  assert.equal(audio.plays, 2)
  player.disconnect()
})

test('pause during a transition cancels pending playback', async () => {
  const { player, audio } = setup({}, { transitionMs: 40 })
  player.play()
  await wait()
  const transition = player.setTheme('dark')
  player.pause()
  await transition
  await wait(50)
  assert.equal(audio.paused, true)
  assert.equal(audio.plays, 1)
  assert.equal(player.getSnapshot().playing, false)
  player.disconnect()
})

test('rapid theme toggles keep only the newest theme and source', async () => {
  const { player, audio } = setup({}, { transitionMs: 20 })
  player.play()
  await wait()
  const first = player.setTheme('dark')
  const second = player.setTheme('light')
  await Promise.all([first, second])
  assert.equal(player.getSnapshot().theme, 'light')
  assert.equal(audio.src, '/a.mp3')
  assert.equal(audio.plays, 1, 'returning to the still-loaded track must not restart it')
  player.disconnect()
})

test('mute and zero-volume theme changes never start playback; unmute is explicit', async () => {
  const { player, audio } = setup()
  player.play()
  await wait()
  player.toggleMute()
  await player.setTheme('dark')
  assert.equal(audio.plays, 1)
  assert.equal(audio.paused, true)
  player.toggleMute()
  await wait()
  assert.equal(audio.plays, 2)
  player.setVolume(0)
  await player.setTheme('light')
  assert.equal(audio.plays, 2)
  assert.equal(audio.paused, true)
  player.disconnect()
})

test('volume and shuffle persist; volume changes during fade-in use the latest value', async () => {
  const { player, audio, saved } = setup({}, { transitionMs: 60 })
  player.play()
  await wait()
  const transition = player.setTheme('dark')
  await wait(40)
  player.setVolume(0.2)
  player.toggleShuffle()
  await transition
  assert.ok(Math.abs(audio.volume - MUSIC_MAX_GAIN * 0.2) < 0.0001)
  assert.equal(saved().volume, 0.2)
  assert.equal(saved().shuffle, true)
  player.disconnect()
})

test('ended advances sequentially and UI effects preference persists independently', async () => {
  const { player, audio, saved } = setup()
  player.play()
  await wait()
  player.toggleEffects()
  audio.dispatchEvent(new Event('ended'))
  await wait()
  assert.equal(audio.src, '/b.mp3')
  assert.equal(player.getSnapshot().playing, true)
  assert.equal(saved().effects, false)
  assert.equal(saved().enabled, true)
  player.step(-1)
  await wait()
  assert.equal(audio.src, '/a.mp3')
  player.disconnect()
})

test('autoplay denial exposes a recoverable state and respects subsequent pause', async () => {
  const { player, audio, saved } = setup()
  audio.playError = Object.assign(new Error('blocked'), { name: 'NotAllowedError' })
  player.play()
  await wait()
  assert.equal(player.getSnapshot().pending, true)
  assert.equal(saved().enabled, true)
  audio.playError = null
  player.resumeAfterGesture()
  await wait()
  assert.equal(player.getSnapshot().playing, true)
  player.pause()
  player.resumeAfterGesture()
  assert.equal(audio.plays, 2)
  player.disconnect()
})

test('bad tracks are skipped, exhausted playlists stop without an infinite retry', async () => {
  const { player, audio, saved } = setup()
  player.play()
  await wait()
  audio.dispatchEvent(new Event('error'))
  await wait()
  assert.equal(audio.src, '/b.mp3')
  audio.dispatchEvent(new Event('error'))
  await wait()
  assert.equal(audio.src, '/c.mp3')
  audio.dispatchEvent(new Event('error'))
  await wait()
  assert.equal(audio.paused, true)
  assert.equal(saved().enabled, false)
  assert.match(player.getSnapshot().message, /unavailable/)
  assert.equal(audio.plays, 3)
  player.disconnect()
})

test('cleanup cancels fades and removes media listeners', async () => {
  const { player, audio } = setup({}, { transitionMs: 30 })
  player.play()
  await wait()
  const transition = player.setTheme('dark')
  player.disconnect()
  await transition
  audio.dispatchEvent(new Event('ended'))
  await wait(40)
  assert.equal(audio.plays, 1)
  assert.equal(audio.paused, true)
})

test('empty playlists and unavailable localStorage do not crash', async () => {
  const player = new MusicPlayer({ playlists: { light: [], dark: [] } })
  const audio = new FakeAudio()
  player.connect(audio, 'light')
  player.play()
  await player.setTheme('dark')
  assert.equal(audio.plays, 0)
  assert.match(player.getSnapshot().message, /No tracks/)
  player.disconnect()
})

test('shuffle bags hear every song before refill and never repeat at a boundary', () => {
  const tracks = ['a', 'b', 'c', 'd', 'e'].map(id => track(id))
  const rotation = new MusicRotation(() => 0.31)
  let current = 'a'
  const first = [current]
  for (let i = 0; i < 4; i++) {
    current = rotation.take(tracks, current, 1, true).id
    first.push(current)
  }
  assert.equal(new Set(first).size, 5)
  for (let cycle = 0; cycle < 12; cycle++) {
    const heard = []
    for (let i = 0; i < 5; i++) {
      const next = rotation.take(tracks, current, 1, true).id
      assert.notEqual(next, current)
      heard.push(next)
      current = next
    }
    assert.equal(new Set(heard).size, 5)
  }
})

test('shuffle Previous retraces playback and Next returns through that history', () => {
  const rotation = new MusicRotation(() => 0.6)
  const first = rotation.take(playlists.light, 'a', 1, true)
  const second = rotation.take(playlists.light, first.id, 1, true)
  assert.equal(rotation.take(playlists.light, second.id, -1, true).id, first.id)
  assert.equal(rotation.take(playlists.light, first.id, -1, true).id, 'a')
  assert.equal(rotation.take(playlists.light, 'a', 1, true).id, first.id)
  assert.equal(rotation.take(playlists.light, first.id, 1, true).id, second.id)
})

test('shuffle skips removed or failed entries remaining in a bag', () => {
  const rotation = new MusicRotation(() => 0.2)
  const first = rotation.take(playlists.light, 'a', 1, true)
  const remaining = playlists.light.filter(item => item.id === first.id || item.id === 'a')
  for (let i = 0, current = first.id; i < 10; i++) {
    const next = rotation.take(remaining, current, 1, true)
    assert.ok(remaining.some(item => item.id === next.id))
    assert.notEqual(next.id, current)
    current = next.id
  }
})

test('shared music continues across themes without resetting its position', async () => {
  const shared = { light: [track('day', 'light', '/shared.mp3')], dark: [track('night', 'dark', '/shared.mp3')] }
  const { player, audio } = setup({}, { playlists: shared, transitionMs: 20 })
  player.play()
  await wait()
  audio.currentTime = 42
  const loads = audio.loads
  await player.setTheme('dark')
  assert.equal(audio.currentTime, 42)
  assert.equal(audio.loads, loads)
  assert.equal(audio.plays, 1)
  assert.equal(player.getSnapshot().track.id, 'night')
  player.pause()
  await player.setTheme('light')
  assert.equal(audio.currentTime, 42)
  assert.equal(audio.paused, true)
  player.disconnect()
})

test('single-song next/previous do not restart; ended still loops the only available song', async () => {
  const { player, audio } = setup({}, { playlists: { light: [track('a')], dark: [] } })
  player.play()
  await wait()
  audio.currentTime = 38
  player.step(1)
  player.step(-1)
  assert.equal(audio.currentTime, 38)
  assert.equal(audio.plays, 1)
  audio.dispatchEvent(new Event('ended'))
  await wait()
  assert.equal(audio.currentTime, 0)
  assert.equal(audio.plays, 2)
  player.disconnect()
})

test('supplied songs are playable in their matching theme and archived plans remain excluded', () => {
  const { MUSIC_PLAYLISTS } = require('../lib/music.ts')
  const catalog = require('../public/music/catalog.json')
  const planned = new Set(require('../docs/music-generation-catalog.json').map(entry => entry.id))
  assert.ok(Object.values(MUSIC_PLAYLISTS).flat().every(item => !planned.has(item.id)))
  for (const theme of ['light', 'dark']) {
    const ready = catalog.filter(entry => entry.status === 'ready' && entry.theme === theme)
    assert.equal(ready.length, 4)
    assert.equal(MUSIC_PLAYLISTS[theme].length, 4)
    assert.equal(MUSIC_PLAYLISTS[theme][0].id, ready[0].id)
    assert.ok(ready.every(entry => MUSIC_PLAYLISTS[theme].some(track => track.id === entry.id)))
    assert.ok(MUSIC_PLAYLISTS[theme].every(track => track.src !== '/music.mp3'))
  }
})

test('retired original selections fall back to supplied songs without losing preferences or autoplaying', async () => {
  const { MUSIC_PLAYLISTS } = require('../lib/music.ts')
  const { player, audio, saved } = setup({ volume: 0.7, muted: true, enabled: true,
    selected: { light: 'original-day', dark: 'original-night' } }, { playlists: MUSIC_PLAYLISTS })
  assert.equal(audio.src, MUSIC_PLAYLISTS.light[0].src)
  assert.equal(saved().selected.light, MUSIC_PLAYLISTS.light[0].id)
  await player.setTheme('dark')
  assert.equal(audio.src, MUSIC_PLAYLISTS.dark[0].src)
  assert.equal(saved().selected.dark, MUSIC_PLAYLISTS.dark[0].id)
  assert.equal(saved().volume, 0.7)
  assert.equal(saved().muted, true)
  assert.equal(audio.plays, 0)
  player.disconnect()
})

test('track attenuation follows the loaded source during fades and never changes saved user volume', async () => {
  const supplied = {
    light: [{ ...track('loud-day'), gain: 0.2 }, track('original')],
    dark: [{ ...track('night', 'dark'), gain: 0.4 }],
  }
  const { player, audio, saved } = setup({}, { playlists: supplied, transitionMs: 50 })
  assert.equal(audio.volume, MUSIC_MAX_GAIN * 0.5 * 0.2, 'restored paused track is already attenuated')
  player.play()
  await wait()
  const outgoing = audio.volume
  const transition = player.setTheme('dark')
  assert.equal(audio.volume, outgoing, 'incoming metadata must not raise the outgoing audio gain')
  await transition
  assert.equal(audio.src, '/night.mp3')
  assert.equal(audio.volume, MUSIC_MAX_GAIN * 0.5 * 0.4)
  player.setVolume(0.7)
  await wait(120)
  assert.ok(Math.abs(audio.volume - MUSIC_MAX_GAIN * 0.7 * 0.4) < 0.0001)
  assert.equal(saved().volume, 0.7)
  player.toggleMute()
  assert.equal(audio.volume, 0)
  player.toggleMute()
  assert.equal(audio.volume, MUSIC_MAX_GAIN * 0.7 * 0.4)
  player.pause()
  await player.setTheme('light')
  assert.equal(audio.paused, true)
  assert.equal(audio.volume, MUSIC_MAX_GAIN * 0.7 * 0.2)
  player.step(1)
  await wait()
  assert.equal(audio.volume, MUSIC_MAX_GAIN * 0.7, 'original recording retains its previous level')
  player.disconnect()
})
