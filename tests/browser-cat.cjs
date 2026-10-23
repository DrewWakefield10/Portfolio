// Real Chrome input, using the existing dependency-free CDP harness.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { startBrowser, runChecks, send, evaluate, until, click, revealHotspot, mouse,
  dimensions, ready, url, output, exceptions, failedAssets } = require('./browser-smoke.cjs')
const scene = require('../lib/store-scene.json')
const state = `document.querySelector('#store-cat').dataset.state`
const animation = `document.querySelector('.cat-sprite').getAnimations()[0]`
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function point() {
  await revealHotspot('#store-cat')
  return evaluate(`(() => {const r=document.querySelector('#store-cat').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
}
async function tap() {
  const p = await point()
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] })
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
async function catScreenshot(name) {
  const clip = await evaluate(`(() => {const r=document.querySelector('#store-cat').getBoundingClientRect();return {x:Math.max(0,r.left),y:r.top,width:Math.min(r.width,innerWidth-r.left),height:r.height,scale:3}})()`)
  const result = await send('Page.captureScreenshot', { format: 'png', clip })
  fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'))
}
async function alignment() {
  const b = scene.interactions.cat
  assert.equal(await evaluate(`(() => {const r=document.querySelector('#store-cat').getBoundingClientRect(),m=document.querySelector('.store-environment').getScreenCTM();return Math.abs(r.left-(${b.x}*m.a+m.e))<.2&&Math.abs(r.top-(${b.y}*m.d+m.f))<.2&&Math.abs(r.width-${b.width}*m.a)<.2&&Math.abs(r.height-${b.height}*m.d)<.2})()`),true,'cat follows the artwork coordinate system')
}

async function main() {
  await startBrowser()
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__catAudio={sources:[],decodes:0};
    const proto=AudioContext.prototype,create=proto.createBufferSource,decode=proto.decodeAudioData;
    proto.decodeAudioData=function(...args){window.__catAudio.decodes++;return decode.apply(this,args)};
    proto.createBufferSource=function(){const source=create.call(this),start=source.start.bind(source),stop=source.stop.bind(source),context=this;
      const record={stops:[],ended:false};source.start=(when)=>{Object.assign(record,{when,delay:when-context.currentTime,perf:performance.now(),duration:source.buffer.duration});window.__catAudio.sources.push(record);start(when)};
      source.stop=(when)=>{record.stops.push(when);stop(when)};source.addEventListener('ended',()=>record.ended=true);return source;};
  ` })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await dimensions(1920,1080)
  await send('Page.navigate', { url })
  await until(ready)
  await until(`document.querySelector('#store-cat')?.disabled===false`)
  await until(`document.querySelector('.store-environment')?.dataset.active==='true'`)
  assert.equal(await evaluate('window.__audioStats.contexts.length'),0,'preloading does not create an audio context')
  assert.equal(await evaluate('window.__catAudio.sources.length'),0,'no automatic meow')
  await evaluate(`window.__catMotion=Array.from(document.querySelectorAll('.fan-rotor,.swimming-fish')).flatMap(e=>e.getAnimations()).map(a=>({a,time:a.currentTime}));true`)
  for (const dark of [false,true]) {
    if (await evaluate(`document.documentElement.classList.contains('dark')`)!==dark) await click('[aria-label="Toggle theme"]')
    await wait(700) // Capture the settled wallpaper, after its existing theme crossfade.
    await alignment()
    await mouse(5,500)
    await catScreenshot(`cat-${dark?'night':'day'}-idle`)
    const p = await point()
    await mouse(p.x,p.y)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('#store-cat')).cursor`),'pointer')
    assert.ok(await evaluate(`Number(getComputedStyle(document.querySelector('.cat-hover')).opacity)>0`))
    const before = await evaluate('window.__catAudio.sources.length')
    await click('#store-cat')
    await until(`${state}!=='idle'`)
    const scheduled = await evaluate(`({audio:window.__catAudio.sources.at(-1),start:${animation}.startTime,duration:${animation}.effect.getTiming().duration})`)
    assert.equal(scheduled.duration,1540)
    assert.ok(Math.abs(scheduled.audio.delay-.28)<.003)
    assert.ok(Math.abs(scheduled.audio.perf+280-scheduled.start-280)<45,'audio and sheet share the mouth-opening deadline')
    assert.ok(scheduled.audio.duration>=1&&scheduled.audio.duration<=1.2)
    await evaluate(`for(let i=0;i<20;i++)document.querySelector('#store-cat').click()`)
    assert.equal(await evaluate('window.__catAudio.sources.length'),before+1,'busy clicks ignored')
    assert.equal(await evaluate(`document.querySelector('.cat-sprite').getAnimations().length`),1)
    // Inspect actual rendered sheet positions at each hold, without interpolation.
    await evaluate(`${animation}.pause();true`)
    for (const [frame,time] of [50,200,360,750,1200,1480].entries()) {
      await evaluate(`${animation}.currentTime=${time};true`)
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cat-sprite')).backgroundPositionX`),frame*20+'%')
      if(frame===3) await catScreenshot(`cat-${dark?'night':'day'}-meow`)
    }
    await evaluate(`${animation}.play();true`)
    await until(`${state}==='idle'`)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cat-pose')).opacity`),'0','exact wallpaper idle restored')
    await wait(1200) // Let the single scheduled recording finish after the timeline inspection.
  }
  assert.equal(await evaluate('window.__catAudio.decodes'),1,'one cached decode across theme changes')
  await click('#store-cat')
  await until(`${state}!=='idle'`)
  await evaluate(`window.__catAnimation=${animation};true`)
  await click('[aria-label="Toggle theme"]')
  assert.equal(await evaluate(`${animation}===window.__catAnimation`),true,'theme change retains the current animation')
  await until(`${state}==='idle'`)

  await click('[aria-label="UI sounds"]')
  const silent = await evaluate('window.__catAudio.sources.length')
  await click('#store-cat')
  await until(`${state}!=='idle'`)
  assert.equal(await evaluate('window.__catAudio.sources.length'),silent,'muted cat still animates silently')
  await until(`${state}==='idle'`)
  await click('[aria-label="UI sounds"]')
  await click('#store-cat')
  await until(`${state}!=='idle'`)
  await click('[aria-label="UI sounds"]')
  assert.ok(await evaluate('window.__catAudio.sources.at(-1).stops.length>0'),'muting cancels even the scheduled meow')
  await until(`${state}==='idle'`)
  await click('[aria-label="UI sounds"]')

  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
  await evaluate(`document.querySelector('#store-cat').focus()`)
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'),'solid')
  for (const [key,code,number] of [['Enter','Enter',13],[' ','Space',32]]) {
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,...(key==='Enter'?{text:'\r'}:{})})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number})
    await until(`${state}!=='idle'`)
    await until(`${state}==='idle'`)
  }
  await click('#store-cat')
  await until(`${state}!=='idle'`)
  await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`)
  assert.equal(await evaluate(state),'idle')
  assert.equal(await evaluate(`document.querySelector('.cat-sprite').getAnimations().length`),0)
  assert.ok(await evaluate('window.__catAudio.sources.at(-1).stops.length>0'))
  await evaluate(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await click('#store-cat')
  await until(`${state}!=='idle'`)
  assert.equal(await evaluate(`${animation}.effect.getKeyframes()[1].backgroundPositionX`),'0%','reduced motion omits ear change')
  await until(`${state}==='idle'`)

  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
  for (const [width,height] of [[390,844],[844,390]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true})
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    for(const dark of [false,true]) {
      if(await evaluate(`document.documentElement.classList.contains('dark')`)!==dark) await click('[aria-label="Toggle theme"]')
      await point()
      await alignment()
      const before = await evaluate('window.__catAudio.sources.length')
      await tap()
      await until(`${state}!=='idle'`)
      assert.equal(await evaluate('window.__catAudio.sources.length'),before+1)
      await until(`${state}==='idle'`)
    }
    const p = await point(), before = await evaluate('window.__catAudio.sources.length')
    const beforeScroll = await evaluate(`document.querySelector('.store-scene-viewport').scrollLeft`)
    const pannable = await evaluate(`document.querySelector('.store-scene-viewport').dataset.pannable==='true'`)
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]})
    for(let step=1;step<=6;step++) {
      await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-step*Math.min(18,(p.x-12)/6),y:p.y,id:1}]})
      await wait(30)
    }
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    assert.equal(await evaluate(state),'idle','swiping across cat does not activate it')
    assert.equal(await evaluate('window.__catAudio.sources.length'),before)
    if(pannable) await until(`document.querySelector('.store-scene-viewport').scrollLeft>${beforeScroll+20}`)
  }
  assert.equal(await evaluate(`(() => {const current=Array.from(document.querySelectorAll('.fan-rotor,.swimming-fish')).flatMap(e=>e.getAnimations());return window.__catMotion.every(({a,time})=>current.includes(a)&&a.currentTime>time)})()`),true,'wallpaper animation timelines remain intact')
  assert.equal(await evaluate('window.__audioStats.media.length'),1,'no extra HTML audio element')
  assert.equal(await evaluate('window.__audioStats.contexts.length'),1,'one shared sound context')
  assert.deepEqual(exceptions,[])
  assert.deepEqual(failedAssets,[])
  fs.writeFileSync(path.join(output,'cat-results.json'),JSON.stringify({passed:true,audio:await evaluate('window.__catAudio')},null,2))
  console.log('PASS cat: six drawn poses; exact idle; synchronized single meow; theme continuity; mute; rapid input; Enter/Space; touch/panning/alignment; visibility cleanup; reduced motion; retained wallpaper timelines')
}
runChecks(main)
