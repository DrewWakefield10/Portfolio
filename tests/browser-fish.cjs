// Real mouse/keyboard/touch input against the production preview on port 3100.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const scene = require('../lib/store-scene.json')
const { startBrowser, runChecks, send, evaluate, until, click, revealHotspot,
  dimensions, mouse, ready, url, output, exceptions, failedAssets } = require('./browser-smoke.cjs')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const state = `document.querySelector('.store-environment').dataset.fishState`
const snapshot = `Array.from(document.querySelectorAll('.swimming-fish'),e=>{const r=e.getBoundingClientRect();return {id:e.dataset.fish,x:r.x+r.width/2,y:r.y+r.height/2,left:r.left,right:r.right,top:r.top,bottom:r.bottom,rate:e.getAnimations()[0].playbackRate,offset:e.parentElement.getAttribute('transform')}})`
async function point(x = 0.5, y = 0.5) {
  await revealHotspot('#store-tank')
  return evaluate(`(() => {const r=document.querySelector('#store-tank').getBoundingClientRect();return {x:r.left+r.width*${x},y:r.top+r.height*${y}}})()`)
}
async function tap(x = 0.5, y = 0.5, touch = false) {
  const p = await point(x,y)
  if(touch) {
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]})
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  } else {
    await mouse(p.x,p.y)
    await mouse(p.x,p.y,'mousePressed')
    await mouse(p.x,p.y,'mouseReleased')
  }
}
async function alignment() {
  const b=scene.interactions.tank
  assert.equal(await evaluate(`(() => {const r=document.querySelector('#store-tank').getBoundingClientRect(),m=document.querySelector('.store-environment').getScreenCTM();return Math.abs(r.left-(${b.x}*m.a+m.e))<.2&&Math.abs(r.top-(${b.y}*m.d+m.f))<.2&&Math.abs(r.width-${b.width}*m.a)<.2&&Math.abs(r.height-${b.height}*m.d)<.2})()`),true)
}
async function insideTank() {
  const b=scene.tank
  const bounds=await evaluate(`(() => {const m=document.querySelector('.store-environment').getScreenCTM();return {left:${b.x}*m.a+m.e,top:${b.y}*m.d+m.f,right:${b.x+b.width}*m.a+m.e,bottom:${b.y+b.height}*m.d+m.f}})()`)
  const fish=await evaluate(snapshot)
  assert.ok(fish.every(f=>f.left>=bounds.left-.5&&f.right<=bounds.right+.5&&f.top>=bounds.top-.5&&f.bottom<=bounds.bottom+.5),JSON.stringify({fish,bounds}))
  return fish
}
async function capture(name) {
  const b=await evaluate(`(() => {const r=document.querySelector('#store-tank').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:2}})()`)
  const image=await send('Page.captureScreenshot',{format:'png',clip:b})
  fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(image.data,'base64'))
}

async function main() {
  await startBrowser()
  await dimensions(1920,1080)
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
  await send('Performance.enable')
  await send('Page.navigate',{url})
  await until(ready)
  await until(`document.querySelector('.store-environment')?.dataset.active==='true'`)
  assert.equal(await evaluate(state),'idle')
  await evaluate(`window.__fishLoops=Array.from(document.querySelectorAll('.environmental-motion')).flatMap(e=>e.getAnimations()).map(a=>({a,time:a.currentTime}));true`)
  const reports=[]
  for(const dark of [false,true]) {
    if(await evaluate(`document.documentElement.classList.contains('dark')`)!==dark)await click('[aria-label="Toggle theme"]')
    await wait(650)
    await alignment()
    const before=await evaluate(snapshot)
    const tones=await evaluate('window.__audioStats.tones.length')
    const start=Date.now()
    const metricsBefore=(await send('Performance.getMetrics')).metrics
    await tap()
    await until(`${state}==='startled'`)
    assert.equal(await evaluate('window.__audioStats.tones.length'),tones+3,'one bubble sound (three staggered bloops)')
    assert.equal(await evaluate(`document.querySelectorAll('.tank-tap-ripple').length`),1)
    assert.equal(await evaluate(`document.querySelector('.tank-tap-ripple').getAnimations().length`),1)
    await capture('fish-'+(dark?'night':'day')+'-ripple')
    await wait(180)
    const peak=await insideTank()
    assert.ok(peak.every(f=>f.rate>=100&&f.rate<=200))
    assert.ok(new Set(peak.map(f=>f.rate.toFixed(2))).size>=4,'independent peak rates')
    const deltas=peak.map((f,i)=>({x:f.x-before[i].x,y:f.y-before[i].y}))
    assert.ok(deltas.some(d=>d.x<0)&&deltas.some(d=>d.x>0),'individual fish scatter left and right')
    await capture('fish-'+(dark?'night':'day')+'-escape')
    await until(`${state}==='recovering'`)
    const recovery=[]
    while(await evaluate(state)!=='idle') {
      const fish=await insideTank()
      recovery.push(fish.map(f=>f.rate))
      await wait(90)
    }
    const elapsed=Date.now()-start
    assert.ok(elapsed>=950&&elapsed<1500,'about one second: '+elapsed)
    const after=await evaluate(snapshot)
    assert.ok(after.every(f=>f.rate===1),'exact default playback rates restored')
    assert.ok(after.some(f=>f.offset!=='translate(0.000 0.000)'))
    for(let i=1;i<recovery.length;i++) assert.ok(recovery[i].every((r,j)=>r<=recovery[i-1][j]+.015),'smooth deceleration')
    await wait(180)
    const offsets=await evaluate(`Array.from(document.querySelectorAll('.fish-escape'),e=>e.getAttribute('transform'))`)
    await wait(180)
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.fish-escape'),e=>e.getAttribute('transform'))`),offsets,'no idle steering loop or snap back')
    const metricsAfter=(await send('Performance.getMetrics')).metrics
    const duration=metrics=>metrics.find(m=>m.name==='ScriptDuration').value
    reports.push({dark,elapsed,peak,deltas,scriptSeconds:duration(metricsAfter)-duration(metricsBefore)})
  }
  // Repeated taps preserve the original deadline cap, animation objects and positions.
  await tap(.12,.45)
  await until(`${state}==='startled'`)
  const firstEnd=await evaluate(`Number(document.querySelector('.store-environment').dataset.fishReactionEnd)`)
  for(let i=0;i<5;i++) {
    await evaluate(`document.querySelector('#store-tank').click()`)
    await wait(125)
    await insideTank()
    assert.ok((await evaluate(snapshot)).every(f=>f.rate<=200.001))
    assert.equal(await evaluate(`Number(document.querySelector('.store-environment').dataset.fishReactionEnd)`),firstEnd)
    if(i===1)await click('[aria-label="Toggle theme"]')
  }
  await until(`${state}==='idle'`,1500)
  assert.ok((await evaluate(snapshot)).every(f=>f.rate===1))
  await wait(450)
  await click('[aria-label="UI sounds"]')
  const muted=await evaluate('window.__audioStats.tones.length')
  await tap(.88,.35)
  await until(`${state}==='startled'`)
  assert.equal(await evaluate('window.__audioStats.tones.length'),muted)
  await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`)
  assert.equal(await evaluate(state),'idle')
  assert.ok((await evaluate(snapshot)).every(f=>f.rate===1))
  await evaluate(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`)
  await click('[aria-label="UI sounds"]')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await wait(220) // Honor the short calm interval before a fresh keyboard burst.
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
  await evaluate(`document.querySelector('#store-tank').focus()`)
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'),'solid')
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
  await until(`${state}==='startled'`)
  await wait(250)
  assert.ok((await evaluate(snapshot)).every(f=>f.rate>=100&&f.rate<=200),'explicit click speed applies under reduced motion too')
  await until(`${state}==='idle'`)
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
  for(const [width,height] of [[390,844],[844,390]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true})
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    for(const dark of [false,true]) {
      if(await evaluate(`document.documentElement.classList.contains('dark')`)!==dark)await click('[aria-label="Toggle theme"]')
      await wait(220)
      await point()
      await alignment()
      const count=await evaluate(`Number(document.querySelector('.store-environment').dataset.fishTapCount)`)
      const tones=await evaluate('window.__audioStats.tones.length')
      await tap(.25,.4,true)
      await until(`${state}==='startled'`)
      assert.equal(await evaluate(`Number(document.querySelector('.store-environment').dataset.fishTapCount)`),count+1,'one reaction per tap')
      assert.equal(await evaluate('window.__audioStats.tones.length'),tones+3)
      await until(`${state}==='idle'`)
      await insideTank()
    }
    const p=await point(), count=await evaluate(`document.querySelector('.store-environment').dataset.fishTapCount`)
    const tones=await evaluate('window.__audioStats.tones.length')
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]})
    for(let i=1;i<=6;i++) {await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+Math.min(18,(width-p.x-10)/6)*i,y:p.y,id:1}]});await wait(25)}
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    assert.equal(await evaluate(state),'idle')
    assert.equal(await evaluate(`document.querySelector('.store-environment').dataset.fishTapCount`),count)
    assert.equal(await evaluate('window.__audioStats.tones.length'),tones)
  }
  assert.equal(await evaluate(`(() => {const current=Array.from(document.querySelectorAll('.environmental-motion')).flatMap(e=>e.getAnimations());return window.__fishLoops.filter(({a})=>!['store-fish-fin','store-fish-bob','store-zapper-glow'].includes(a.animationName)).every(({a,time})=>current.includes(a)&&a.currentTime>time)})()`),true,'swim/turn/fan timelines retain identity and advance across interactions')
  assert.equal(await evaluate('window.__audioStats.media.length'),1)
  assert.equal(await evaluate('window.__audioStats.contexts.length'),1)
  assert.deepEqual(exceptions,[])
  assert.deepEqual(failedAssets,[])
  fs.writeFileSync(path.join(output,'fish-results.json'),JSON.stringify({passed:true,reports},null,2))
  console.log('PASS fish: independent 100–200x bursts, normal speed by 1s, fixed deadline under repeated taps, bubble sound, bounded paths, preserved timelines/positions, mute, explicit speed under reduced motion, hidden cleanup, keyboard and mobile taps/panning in both themes')
}
runChecks(main)
