// Promote only supplied, decodable, explicitly-ready files into the browser playlist.
const fs = require('node:fs')
const path = require('node:path')
const { analyzeAudio, verifyMaster, suppliedTrackGain } = require('./music-audio.cjs')
const root = path.resolve('public/music')
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'))
if (!Array.isArray(catalog)) throw Error('Music catalog must be an array.')
const tracks = []
const ids = new Set(['original-day', 'original-night'])
const sources = new Set()
for (const entry of catalog) {
  if (entry.status !== 'ready') continue
  if (!entry.id || typeof entry.id !== 'string' || !entry.title || typeof entry.title !== 'string'
    || !['light', 'dark'].includes(entry.theme) || typeof entry.file !== 'string'
    || !/\.(mp3|ogg|m4a|aac)$/i.test(entry.file) || (entry.artist !== undefined && typeof entry.artist !== 'string')) {
    throw Error('Invalid ready-track metadata: ' + String(entry.id))
  }
  const file = path.resolve(root, entry.file)
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)
    || !fs.realpathSync(file).startsWith(fs.realpathSync(root) + path.sep)
    || !fs.statSync(file).isFile() || fs.statSync(file).size < 1024) throw Error('Missing or invalid audio: ' + entry.file)
  const analysis = analyzeAudio(file)
  const supplied = entry.collection === 'user-supplied'
  const gain = supplied ? suppliedTrackGain(analysis, entry.file) : undefined
  if (!supplied) verifyMaster(analysis, entry.file)
  if (entry.collection === 'store-soundtrack-expansion-v1' && analysis.durationSeconds < 120) {
    throw Error('New soundtrack songs must be 2-3 minutes: ' + entry.file)
  }
  const src = '/music/' + path.relative(root, file).split(path.sep).map(encodeURIComponent).join('/')
  if (ids.has(entry.id) || sources.has(src)) throw Error('Duplicate track ID or source: ' + entry.id)
  ids.add(entry.id); sources.add(src)
  tracks.push({ id: entry.id, title: entry.title, ...(entry.artist ? { artist: entry.artist } : {}), src,
    theme: entry.theme, ...(supplied ? { gain } : {}) })
  console.log(entry.title + ': ' + analysis.durationSeconds.toFixed(1) + 's, ' + analysis.integratedLufs + ' LUFS, '
    + analysis.truePeakDbtp + ' dBTP' + (supplied ? ', playback gain ' + gain : ''))
}
fs.writeFileSync('lib/music-library.json', JSON.stringify(tracks, null, 2) + '\n')
console.log(tracks.length + ' verified additional tracks activated; planned entries remain excluded.')

