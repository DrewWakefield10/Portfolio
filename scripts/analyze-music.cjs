// Inventory actual music assets, independently of planned/ready catalog status.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { analyzeAudio } = require('./music-audio.cjs')

function inventory(directory) {
  return fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? inventory(file) : /\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(entry.name) ? [file] : []
  }) : []
}

const files = [path.resolve('public/music.mp3'), ...inventory(path.resolve('public/music'))]
const report = files.filter(file => fs.existsSync(file)).map(file => ({
  file: path.relative(process.cwd(), file).split(path.sep).join('/'),
  sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  ...analyzeAudio(file),
}))
console.log(JSON.stringify(report, null, 2))
