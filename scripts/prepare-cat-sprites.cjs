// Bake six anchored, transparent poses from the original wallpaper pixels.
// The generated pose study is in docs/cat-art; bodies are never regenerated.
const fs = require('node:fs')
const path = require('node:path')
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }))
const box = { left: 28, top: 682, width: 252, height: 83 }
const output = path.resolve('public/wallpapers/animation/cat')
const svg = content => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="252" height="83" shape-rendering="crispEdges">${content}</svg>`)
const silhouette = '10,72 10,53 16,43 29,35 50,29 61,21 76,15 90,10 118,9 143,9 163,13 177,18 183,16 185,14 190,21 197,28 209,28 214,15 220,18 226,30 228,38 234,43 236,65 228,73 21,73'

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const mask = await sharp(svg(`<polygon points="${silhouette}" fill="white"/>`)).png().toBuffer()
  await sharp(mask).toFile(path.join(output, 'mask.png'))
  // Composite only the changing face/ear regions at runtime. The body's existing
  // browser-scaled wallpaper pixels stay visible throughout, including at fractional scales.
  await sharp(svg('<path fill="white" d="M197 60h22v11h-22zM186 23h5v8h-5z"/>'))
    .png().toFile(path.join(output, 'motion-mask.png'))
  for (const mode of ['day', 'night']) {
    const original = await sharp(`public/wallpapers/store-${mode}-master.png`).extract(box).ensureAlpha().raw().toBuffer()
    const frames = []
    const color = (x, y) => {
      const i = ((y - box.top) * box.width + x - box.left) * 4
      return `rgb(${original[i]},${original[i + 1]},${original[i + 2]})`
    }
    // Use the source's actual cream, outline and coral palette in each lighting mode.
    const dark = color(219, 732), tongue = color(239, 740), ear = color(217, 711)
    let repair = ''
    // A small cheek-texture patch covers the original licking mouth; all fur and
    // outlines elsewhere remain byte-for-byte source pixels. No clean-plate is needed.
    for (let y = 742; y < 753; y++) for (let x = 225; x < 246; x++) {
      if (y >= 750 && (x < 231 || x > 242)) continue
      repair += `<rect x="${x - box.left}" y="${y - box.top}" width="1" height="1" fill="${color(246 + (x % 3), 737 + Math.min(6, y - 742))}"/>`
    }
    const mouth = (left, top, width, height) => `<path fill="${dark}" d="M${left + 2} ${top}h${width - 4}v1h2v${height - 2}h-2v1h-${width - 4}v-1h-2v-${height - 2}h2z"/><rect x="${left + 2}" y="${top + height - 3}" width="${width - 4}" height="2" fill="${tongue}"/>`
    for (let frame = 0; frame < 6; frame++) {
      let detail = ''
      if (frame === 1) detail = `<path d="M186 23h2v4h2v3h-3v-3h-1z" fill="${ear}"/>`
      if (frame === 2) detail = repair + mouth(207, 62, 6, 5)
      if (frame === 3) detail = repair + mouth(205, 60, 10, 10)
      if (frame === 4) detail = repair + mouth(207, 63, 7, 6)
      let image = sharp(original, { raw: { width: box.width, height: box.height, channels: 4 } })
      if (detail) image = image.composite([{ input: svg(detail) }])
      const pixels = await image.png().toBuffer()
      const png = await sharp(pixels).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
      frames.push(png)
      fs.writeFileSync(path.join(output, `${mode}-${frame}.png`), png)
    }
    await sharp({ create: { width: box.width * 6, height: box.height, channels: 4, background: '#00000000' } })
      .composite(frames.map((input, index) => ({ input, left: index * box.width, top: 0 })))
      .png().toFile(path.join(output, `${mode}-meow.png`))
  }
  console.log('Created 12 original-pixel poses, two six-frame sheets, silhouette and motion masks.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
