// Reapply the same deterministic lettering to native-resolution generated images.
// Usage: node scripts/prepare-wallpapers.cjs <day-source.png> [night-source.png]
const fs = require('node:fs')
const path = require('node:path')
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }))
const output = path.resolve('public/wallpapers')
const signage = fs.readFileSync('docs/wallpaper-signage.svg')
async function prepare(source, name) {
  const metadata = await sharp(source).metadata()
  if (metadata.width !== 1672 || metadata.height !== 941) {
    throw new Error('Expected native 1672x941 artwork; adjust the signage viewBox for a new generation. Never silently upscale.')
  }
  fs.mkdirSync(output, { recursive: true })
  const master = path.join(output, 'store-' + name + '-master.png')
  const layer = name === 'night' ? Buffer.from(signage.toString('utf8')
    .replaceAll('#f46a5e', '#cf4e34').replaceAll('#b7443b', '#73302c')
    .replaceAll('#133340', '#132d36').replaceAll('#435b68', '#263c47')
    .replaceAll('#f5edcf', '#dec29a').replaceAll('#f6f0d9', '#e9be89')
    .replaceAll('#faf3df', '#e5ba87').replaceAll('#872c34', '#6d292f')) : signage
  await sharp(source).composite([{ input: layer }]).png().toFile(master)
  await sharp(master).webp({ quality: 94, effort: 6 }).toFile(path.join(output, 'store-' + name + '.webp'))
  console.log(name + ': generated native 1672x941; shared signage; WebP quality 94')
}
async function main() {
  if (!process.argv[2]) throw new Error('Provide a daytime generation path.')
  await prepare(process.argv[2], 'day')
  if (process.argv[3]) await prepare(process.argv[3], 'night')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
