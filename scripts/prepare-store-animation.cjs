// Uses original pixels for sprites and narrowly masked generated clean-plate repairs.
// node scripts/prepare-store-animation.cjs <day-clean-plate.png> <night-clean-plate.png>
const fs = require('node:fs')
const path = require('node:path')
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }))
const scene = require('../lib/store-scene.json')
const output = path.resolve('public/wallpapers/animation')
const svg = content => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}">${content}</svg>`)

function fishMask(data, fish) {
  const { width, height } = fish
  const mask = Buffer.alloc(width * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = ((fish.y + y) * scene.width + fish.x + x) * 4
    const [r, g, b] = data.subarray(i, i + 3)
    if (r > g * 0.75 && r > b * 1.05 && r > 80) mask[y * width + x] = 255
  }
  // Fill enclosed holes (eyes, dark mouth/outline pixels) without retaining water.
  const outside = new Uint8Array(width * height)
  const queue = []
  const visit = i => { if (!mask[i] && !outside[i]) { outside[i] = 1; queue.push(i) } }
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1) }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], x = i % width, y = Math.floor(i / width)
    if (x) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (y) visit(i - width)
    if (y < height - 1) visit(i + width)
  }
  for (let i = 0; i < mask.length; i++) if (!outside[i]) mask[i] = 255
  return mask
}

async function main() {
  if (!process.argv[2] || !process.argv[3]) throw Error('Provide both generated clean plates.')
  fs.mkdirSync(output, { recursive: true })
  const day = await sharp('public/wallpapers/store-day-master.png').ensureAlpha().raw().toBuffer()
  const masks = scene.fish.map(fish => fishMask(day, fish))
  const repair = Buffer.alloc(scene.width * scene.height * 4)
  // A three-pixel dilation removes antialiased stationary fins and shadows.
  scene.fish.forEach((fish, index) => {
    for (let y = 0; y < fish.height; y++) for (let x = 0; x < fish.width; x++) {
      if (!masks[index][y * fish.width + x]) continue
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const i = ((fish.y + y + dy) * scene.width + fish.x + x + dx) * 4
        repair[i] = repair[i + 1] = repair[i + 2] = repair[i + 3] = 255
      }
    }
  })
  const fishRepair = await sharp(repair, { raw: { width: scene.width, height: scene.height, channels: 4 } }).png().toBuffer()
  const { fan, clock, tank } = scene
  const movingParts = svg(`<circle cx="${fan.cx}" cy="${fan.cy}" r="${fan.radius}" fill="white"/>
    <path d="M1180 125 L1210 153 L1187 174" fill="none" stroke="white" stroke-width="13" stroke-linejoin="round" stroke-linecap="square"/>
    <circle cx="${clock.cx}" cy="${clock.cy}" r="7" fill="white"/>`)
  for (const [index, theme] of ['day', 'night'].entries()) {
    const source = `public/wallpapers/store-${theme}-master.png`
    const generated = process.argv[index + 2]
    const metadata = await sharp(generated).metadata()
    if (metadata.width !== scene.width || metadata.height !== scene.height) throw Error('Clean plate must match native scene dimensions.')
    const original = await sharp(source).ensureAlpha().raw().toBuffer()
    const patch = await sharp(generated).ensureAlpha().composite([{ input: fishRepair, blend: 'dest-in' }]).png().toBuffer()
    const machineryPatch = await sharp(generated).ensureAlpha().composite([{ input: movingParts, blend: 'dest-in' }]).png().toBuffer()
    await sharp(source).composite([{ input: patch }, { input: machineryPatch }]).webp({ quality: 96, effort: 6 }).toFile(path.join(output, theme + '-base.webp'))
    for (const [fishIndex, fish] of scene.fish.entries()) {
      const pixels = Buffer.alloc(fish.width * fish.height * 4)
      for (let y = 0; y < fish.height; y++) for (let x = 0; x < fish.width; x++) {
        const from = ((fish.y + y) * scene.width + fish.x + x) * 4
        const to = (y * fish.width + x) * 4
        if (masks[fishIndex][y * fish.width + x]) {
          original.copy(pixels, to, from, from + 3)
          pixels[to + 3] = 255
        }
      }
      await sharp(pixels, { raw: { width: fish.width, height: fish.height, channels: 4 } }).png().toFile(path.join(output, theme + '-' + fish.id + '.png'))
    }
    const hubMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><circle cx="22" cy="22" r="22" fill="white"/></svg>`)
    await sharp(source).extract({ left: fan.cx - 22, top: fan.cy - 22, width: 44, height: 44 }).ensureAlpha().composite([{ input: hubMask, blend: 'dest-in' }]).png().toFile(path.join(output, theme + '-fan-hub.png'))
    const foreground = Buffer.alloc(tank.width * tank.height * 4)
    for (let y = 0; y < tank.height; y++) for (let x = 0; x < tank.width; x++) {
      const sourceIndex = ((tank.y + y) * scene.width + tank.x + x) * 4
      const [r, g, b] = day.subarray(sourceIndex, sourceIndex + 3)
      const target = (y * tank.width + x) * 4
      if ((g > r * 1.35 && b < g * 0.88 && g < 210) || tank.y + y > 640) {
        original.copy(foreground, target, sourceIndex, sourceIndex + 3)
        foreground[target + 3] = 255
      }
    }
    await sharp(foreground, { raw: { width: tank.width, height: tank.height, channels: 4 } }).png().toFile(path.join(output, theme + '-tank-foreground.png'))
    console.log(theme + ': masked clean base, 6 original fish sprites, fan hub, aquarium foreground')
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
