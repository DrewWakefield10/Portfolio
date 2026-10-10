// Promote only supplied, decodable, explicitly-ready files into the browser playlist.
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
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
    || !/\.(mp3|ogg)$/i.test(entry.file) || (entry.artist !== undefined && typeof entry.artist !== 'string')) {
    throw Error('Invalid ready-track metadata: ' + String(entry.id))
  }
  const file = path.resolve(root, entry.file)
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)
    || !fs.realpathSync(file).startsWith(fs.realpathSync(root) + path.sep)
    || fs.statSync(file).size < 1024) throw Error('Missing or invalid audio: ' + entry.file)
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file],
    { encoding: 'utf8', windowsHide: true })
  if (probe.error) throw Error('FFprobe is required to verify supplied audio before activation.')
  if (probe.status !== 0) throw Error('Undecodable audio: ' + entry.file)
  const metadata = JSON.parse(probe.stdout)
  const duration = Number(metadata.format?.duration)
  if (!metadata.streams?.some(stream => stream.codec_type === 'audio') || !Number.isFinite(duration) || duration < 60 || duration > 180) {
    throw Error('Expected playable 1–3 minute audio: ' + entry.file)
  }
  const src = '/music/' + entry.file.split(path.sep).join('/')
  if (ids.has(entry.id) || sources.has(src)) throw Error('Duplicate track ID or source: ' + entry.id)
  ids.add(entry.id); sources.add(src)
  tracks.push({ id: entry.id, title: entry.title, ...(entry.artist ? { artist: entry.artist } : {}), src, theme: entry.theme })
}
fs.writeFileSync('lib/music-library.json', JSON.stringify(tracks, null, 2) + '\n')
console.log(tracks.length + ' verified additional tracks activated; planned entries remain excluded.')

