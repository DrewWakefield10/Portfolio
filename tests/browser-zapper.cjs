// Focused real-input checks; start the production preview on port 3100 first.
const assert = require('node:assert/strict')
const { startBrowser, runChecks, send, evaluate, until, click, revealHotspot, mouse,
  dimensions, ready, url, exceptions, failedAssets } = require('./browser-smoke.cjs')
const scene = require('../lib/store-scene.json')
const flashes = `document.querySelector('.zapper-click-flash').getAnimations()`
const zapCount = `window.__audioStats.tones.filter(t=>t.type==='sawtooth').length`
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function tapZapper() {
  await revealHotspot('#store-zapper')
  const point = await evaluate(`(() => {const r=document.querySelector('#store-zapper').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] })
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function main() {
  await startBrowser()
  await dimensions(1920,1080)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await send('Page.navigate', { url })
  await until(ready)
  await until(`document.querySelector('.store-environment')?.dataset.active==='true'`)
  await evaluate(`window.__zapperMotion=Array.from(document.querySelectorAll('.fan-rotor,.swimming-fish')).flatMap(e=>e.getAnimations()).map(a=>({a,time:a.currentTime}));true`)
  for (const [width,height] of [[1920,1080],[390,844]]) {
    await dimensions(width,height)
    await send('Emulation.setTouchEmulationEnabled', { enabled: width===390, maxTouchPoints: 1 })
    for (const dark of [false,true]) {
      if (await evaluate(`document.documentElement.classList.contains('dark')`)!==dark) await click('[aria-label="Toggle theme"]')
      await revealHotspot('#store-zapper')
      const box = scene.interactions.zapper
      assert.equal(await evaluate(`(() => {const r=document.querySelector('#store-zapper').getBoundingClientRect(),m=document.querySelector('.store-environment').getScreenCTM();return Math.abs(r.left-(${box.x}*m.a+m.e))<.2&&Math.abs(r.top-(${box.y}*m.d+m.f))<.2&&Math.abs(r.width-${box.width}*m.a)<.2&&Math.abs(r.height-${box.height}*m.d)<.2})()`),true,'hit area follows artwork after panning')
      const before = await evaluate(zapCount)
      if (width===390) await tapZapper()
      else await click('#store-zapper')
      await until(`${zapCount}===${before+1}`)
      assert.equal(await evaluate(`${flashes}.length`),1,'one local flicker per activation')
      assert.equal(await evaluate(`document.querySelectorAll('.retro-app-window').length`),0)
      assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`),dark)
      await until(`${flashes}.length===0`)
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.zapper-click-flash')).opacity`),'0')
      await evaluate(`for(let i=0;i<12;i++)document.querySelector('#store-zapper').click()`)
      assert.equal(await evaluate(`${flashes}.length`),1,'rapid clicks replace the flicker rather than stack')
      await until(`${flashes}.length===0`)
    }
  }
  // Swiping directly over the zapper must pan the scene without sound or a flash.
  await revealHotspot('#store-zapper')
  const point = await evaluate(`(() => {const r=document.querySelector('#store-zapper').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  const beforeSwipe = await evaluate(zapCount)
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] })
  for (let step=1;step<=5;step++) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x:point.x-step*20,y:point.y,id:1 }] })
    await wait(25)
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.equal(await evaluate(zapCount),beforeSwipe)
  assert.equal(await evaluate(`${flashes}.length`),0)

  await dimensions(1920,1080)
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await click('[aria-label="UI sounds"]')
  const silent = await evaluate(`window.__audioStats.tones.length`)
  await click('#store-zapper')
  assert.equal(await evaluate(`window.__audioStats.tones.length`),silent,'UI FX OFF silences zaps')
  assert.equal(await evaluate(`${flashes}.length`),1,'visual feedback still works when muted')
  await until(`${flashes}.length===0`)
  await click('[aria-label="UI sounds"]')
  await mouse(5,500)
  const beforeHover = await evaluate(`window.__audioStats.tones.length`)
  const desktopPoint = await evaluate(`(() => {const r=document.querySelector('#store-zapper').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  await mouse(desktopPoint.x,desktopPoint.y)
  assert.equal(await evaluate(`window.__audioStats.tones.length`),beforeHover,'hover alone does not zap')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await evaluate(`document.querySelector('#store-zapper').focus()`)
  const beforeKeyboard = await evaluate(zapCount)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await until(`${zapCount}===${beforeKeyboard+1}`)
  await until(`${flashes}.length===0`)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await click('#store-zapper')
  assert.equal(await evaluate(`${flashes}[0].effect.getKeyframes().length`),2,'reduced motion gets a single gentle fade')
  await until(`${flashes}.length===0`)
  assert.equal(await evaluate(`(() => {const current=Array.from(document.querySelectorAll('.fan-rotor,.swimming-fish')).flatMap(e=>e.getAnimations());return window.__zapperMotion.length>0&&window.__zapperMotion.every(({a,time})=>current.includes(a)&&a.currentTime>time)})()`),true,'fan and fish timelines are preserved')
  assert.equal(await evaluate(`window.__audioStats.media.length`),1)
  assert.equal(await evaluate(`window.__audioStats.contexts.length`),1)
  assert.deepEqual(exceptions,[])
  assert.deepEqual(failedAssets,[])
  console.log('PASS bug zapper: mouse/touch/keyboard, both themes, local repeatable flicker, quiet shared audio, mute, reduced motion, silent panning and retained wallpaper motion')
}

runChecks(main)
