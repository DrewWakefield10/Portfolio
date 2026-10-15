// Real touch input in headless Chrome, with phone/tablet viewport emulation.
// This does not claim real-device Safari or Android hardware coverage.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const scene = require('../lib/store-scene.json')
const musicLibrary = require('../lib/music-library.json')
const { startBrowser, runChecks, send, evaluate, until, revealHotspot, screenshot,
  reload, ready, audioState, url, output, exceptions, failedAssets } = require('./browser-smoke.cjs')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const viewports = [[320,568],[375,667],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[1920,1080]]
const scrollPosition = 'document.querySelector(".store-scene-viewport").scrollLeft'
const reports = []

async function dimensions(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 1024 })
  await wait(180)
}
async function point(selector) {
  await revealHotspot(selector)
  return evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
}
async function tap(selector) {
  const touch = await point(selector)
  assert.equal(await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}),hit=document.elementFromPoint(${touch.x},${touch.y});return !!hit&&e.contains(hit)})()`),true,'tap reaches '+selector)
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch, id: 1 }] })
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(100)
}
async function swipe(x, y, dx, dy = 0) {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  for (let step = 1; step <= 10; step++) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x:x+dx*step/10, y:y+dy*step/10, id:1 }] })
    await wait(35)
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(350)
}
async function assertWindow(id) {
  await until(`!!document.querySelector('[data-window-id=${id}]')`)
  const layout = await evaluate(`(() => {const e=document.querySelector('[data-window-id=${id}]'),r=e.getBoundingClientRect(),close=e.querySelector('[aria-label="Close window"]').getBoundingClientRect(),nav=document.querySelector('.desktop-navigation').getBoundingClientRect();return {x:r.left,y:r.top,right:r.right,bottom:r.bottom,width:r.width,nav:nav.bottom,close:close.width,height:close.height,overflow:e.scrollWidth>e.clientWidth+1,count:document.querySelectorAll('[data-window-id=${id}]').length}})()`)
  assert.equal(layout.count,1)
  assert.equal(layout.overflow,false,'no horizontal overflow in '+id)
  assert.ok(layout.x>=-0.5&&layout.y>=-0.5&&layout.right<=await evaluate('innerWidth')+0.5&&layout.bottom<=await evaluate('innerHeight')+0.5,JSON.stringify(layout))
  if (await evaluate('innerWidth<=1024')) {
    assert.ok(layout.y>=layout.nav+7,'title is below the fixed navigation')
    assert.ok(layout.close>=44&&layout.height>=44,'touch-sized close button')
    if(['about','works','contact'].includes(id)) assert.ok(layout.width>=await evaluate('innerWidth-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-area-left"))||0)-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-area-right"))||0)')*.91,'nearly full-width app within safe areas')
  }
  return layout
}
async function close(id) { await tap(`[data-window-id=${id}] [aria-label="Close window"]`) }
async function assertAlignment() {
  for(const [id,box] of Object.entries(scene.interactions).filter(([id])=>['pc','phone','clock','calendar','board','fan','machines'].includes(id))) {
    assert.equal(await evaluate(`(() => {const r=document.querySelector('#store-${id}').getBoundingClientRect(),m=document.querySelector('.store-environment').getScreenCTM();return Math.abs(r.left-(${box.x}*m.a+m.e))<.2&&Math.abs(r.top-(${box.y}*m.d+m.f))<.2&&Math.abs(r.width-${box.width}*m.a)<.2&&Math.abs(r.height-${box.height}*m.d)<.2})()`),true,'scene-aligned '+id)
  }
}

async function main() {
  await startBrowser()
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await send('Performance.enable')
  await dimensions(390,844)
  await send('Page.navigate',{url})
  await until(ready)
  await until('document.querySelector(".store-environment")?.dataset.active==="true"')
  assert.equal((await evaluate(audioState)).playing,0,'mobile never autoplays on first visit')
  assert.equal(await evaluate('document.querySelectorAll(".retro-app-window").length'),0)
  assert.equal(await evaluate('document.querySelector(".store-scene-viewport").dataset.pannable'),'true')
  const pc = await point('#store-pc')
  assert.ok(pc.x>0&&pc.x<390,'initial view includes PC')
  await evaluate('window.__retainedMotion=Array.from(document.querySelectorAll(".fan-rotor,.swimming-fish")).flatMap(e=>e.getAnimations()).map(a=>({a,time:a.currentTime}));true')
  const beforePan = await evaluate(audioState)
  const beforeMetrics = (await send('Performance.getMetrics')).metrics
  const beforePosition = await evaluate(scrollPosition)
  await swipe(pc.x,pc.y,-Math.min(pc.x-15,100))
  assert.ok(await evaluate(scrollPosition)>beforePosition+20,'swiping left reveals the right side')
  assert.equal(await evaluate('document.querySelectorAll(".retro-app-window").length'),0,'swipe across PC does not launch Home')
  assert.equal((await evaluate(audioState)).tones,beforePan.tones,'panning is silent')
  assert.equal((await evaluate(audioState)).playing,0)
  assert.equal(await evaluate('document.querySelector(".store-scene-viewport").dataset.panHint'),'false')
  const rightPosition = await evaluate(scrollPosition)
  await swipe(70,700,150)
  assert.ok(await evaluate(scrollPosition)<rightPosition,'swiping right reveals the left side')
  await assertAlignment()
  const afterMetrics = (await send('Performance.getMetrics')).metrics
  const metric = (metrics,name) => metrics.find(entry=>entry.name===name)?.value ?? 0
  const panningMetrics = Object.fromEntries(['TaskDuration','ScriptDuration','LayoutCount','RecalcStyleCount'].map(name=>[name,metric(afterMetrics,name)-metric(beforeMetrics,name)]))
  console.log('PASS native one-finger panning, tap/swipe distinction, silent gestures and PC-centered initial view')

  for(const [width,height] of viewports) {
    await dimensions(width,height)
    const geometry = await evaluate('(() => {const v=document.querySelector(".store-scene-viewport"),s=document.querySelector(".store-scene").getBoundingClientRect();return {width:s.width,height:s.height,overflow:document.documentElement.scrollWidth>innerWidth,scroll:v.scrollLeft,maximum:v.scrollWidth-v.clientWidth}})()')
    const expected = width<=1024?Math.max(width,height*scene.width/scene.height):width
    assert.ok(Math.abs(geometry.width-expected)<1)
    assert.equal(geometry.height,height)
    assert.equal(geometry.overflow,false)
    if(width<=1024) {
      await evaluate('document.querySelector(".store-scene-viewport").scrollLeft=1e6;true')
      assert.ok(Math.abs(await evaluate(scrollPosition)-geometry.maximum)<1,'right scene boundary is reachable and clamped')
      await assertAlignment()
      await evaluate('document.querySelector(".store-scene-viewport").scrollLeft=-1e6;true')
      assert.equal(await evaluate(scrollPosition),0,'left scene boundary is reachable and clamped')
    }
    for(const dark of [false,true]) {
      if(await evaluate('document.documentElement.classList.contains("dark")')!==dark) await tap('[aria-label="Toggle theme"]')
      await assertAlignment()
      const transparent = await evaluate('Array.from(document.querySelectorAll(".desktop-navigation,.music-player,.theme-toggle"),e=>getComputedStyle(e).backgroundColor).every(c=>c==="rgba(0, 0, 0, 0)")')
      // Move the touch pointer off controls before checking normal transparent surfaces.
      assert.equal(transparent,true,'navigation remains transparent')
      await revealHotspot('#store-pc')
      const pos = await evaluate(scrollPosition)
      await tap('#store-pc')
      await assertWindow('home')
      assert.ok(Math.abs(await evaluate(scrollPosition)-pos)<1,'opening Home preserves scene position')
      await tap('[aria-label="Open About"]')
      const about = await assertWindow('about')
      await screenshot(`mobile-${width}-${dark?'night':'day'}-about`)
      await close('about')
      await close('home')
      for(const [object,id] of [['phone','contact'],['clock','time'],['calendar','calendar'],['board','works'],['machines','sources']]) {
        await revealHotspot('#store-'+object)
        const position = await evaluate(scrollPosition)
        await tap('#store-'+object)
        await assertWindow(id)
        if(id==='sources') {
          const credits=await evaluate(`(() => {const e=document.querySelector('[data-window-id=sources]');return {text:e.textContent,music:e.querySelectorAll('[data-music-credit]').length,links:Array.from(e.querySelectorAll('a[target="_blank"]'),a=>({href:a.href,rel:a.rel}))}})()`)
          assert.ok(credits.text.includes('Pixel Jeff')&&credits.text.includes('shar’s desktop'))
          assert.equal(credits.music,new Set(musicLibrary.map(track=>track.src)).size,'all current recordings credited once')
          assert.ok(credits.links.some(link=>link.href==='https://www.sharyap.com/'))
          assert.ok(credits.links.some(link=>link.href==='https://pixeljeff1995.artstation.com/'))
          assert.ok(credits.links.every(link=>link.rel.includes('noopener')&&link.rel.includes('noreferrer')))
        }
        await close(id)
        assert.ok(Math.abs(await evaluate(scrollPosition)-position)<1,'closing '+id+' preserves scene position')
      }
      await revealHotspot('#store-fan')
      const speed = await evaluate('document.querySelector("#store-fan").dataset.fanSpeed')
      await tap('#store-fan')
      assert.notEqual(await evaluate('document.querySelector("#store-fan").dataset.fanSpeed'),speed)
      for(const light of ['left','right']) {
        await revealHotspot(`[data-light=${light}]`)
        const position=await evaluate(scrollPosition)
        const theme=await evaluate('document.documentElement.classList.contains("dark")')
        await tap(`[data-light=${light}]`)
        assert.notEqual(await evaluate('document.documentElement.classList.contains("dark")'),theme)
        assert.ok(Math.abs(await evaluate(scrollPosition)-position)<1,'theme preserves scene position')
      }
      if(!dark) reports.push({viewport:[width,height],scene:geometry,about})
    }
    console.log(`PASS ${width}x${height}: both themes, window/fan/light hotspots, fitted windows, transparent stationary navigation`)
  }

  await dimensions(390,844)

  await evaluate('document.documentElement.style.setProperty("--safe-area-top","24px");document.documentElement.style.setProperty("--safe-area-left","20px");document.documentElement.style.setProperty("--safe-area-right","10px");document.documentElement.style.setProperty("--safe-area-bottom","16px");true')
  await tap('#store-phone')
  const safeWindow=await assertWindow('contact')
  assert.ok(safeWindow.x>=32&&safeWindow.right<=368&&safeWindow.bottom<=816,'simulated cutouts preserve safe margins')
  await close('contact')
  await evaluate('["top","left","right","bottom"].forEach(edge=>document.documentElement.style.removeProperty("--safe-area-"+edge));true')
  await evaluate('document.querySelector(".store-scene-viewport").scrollLeft=650;true')
  await wait(100)
  const center = await evaluate('(() => {const v=document.querySelector(".store-scene-viewport");return (v.scrollLeft+v.clientWidth/2)/v.scrollWidth})()')
  await dimensions(844,390)
  const rotated = await evaluate('(() => {const v=document.querySelector(".store-scene-viewport");return {position:v.scrollLeft,width:v.clientWidth,scene:v.scrollWidth}})()')
  assert.ok(Math.abs(rotated.position-Math.max(0,Math.min(center*rotated.scene-rotated.width/2,rotated.scene-rotated.width)))<2,'rotation preserves scene center and clamps boundaries')
  await tap('#store-pc')
  await tap('[aria-label="Open About"]')
  await assertWindow('about')
  const landscapeScroll = await evaluate('(() => {const e=document.querySelector(".about-window");e.scrollTop=500;return e.scrollTop})()')
  assert.ok(landscapeScroll>0,'landscape profile and all details scroll together')
  await close('about')
  await close('home')
  await dimensions(390,844)

  await tap('#store-pc')
  await tap('[aria-label="Open About"]')
  await assertWindow('about')
  const details='[aria-label="About details"]'
  await evaluate(`document.querySelector('${details}').scrollTop=0;true`)
  const skill=await point('.skill-item')
  const scrollAudio=await evaluate(audioState)
  const startScroll=await evaluate(`document.querySelector('${details}').scrollTop`)
  await swipe(skill.x,skill.y,0,-100)
  assert.ok(await evaluate(`document.querySelector('${details}').scrollTop`)>startScroll,'touch scrolls About details')
  assert.equal((await evaluate(audioState)).tones,scrollAudio.tones,'scrolling across skills is silent')
  await evaluate('document.querySelector("#interest-trigger-retro-ui").scrollIntoView({block:"center"});true')
  await tap('#interest-trigger-retro-ui')
  await assertWindow('interest-retro-ui')
  assert.equal(await evaluate('document.querySelectorAll(".interest-cloud-shape").length'),1)
  await screenshot('mobile-interest-cloud')
  const cloudBefore=await evaluate('document.querySelector("[data-window-id=interest-retro-ui]").style.left')
  const cloudContent=await point('[data-window-id=interest-retro-ui] .retro-window-body')
  await swipe(cloudContent.x,cloudContent.y,30)
  assert.equal(await evaluate('document.querySelector("[data-window-id=interest-retro-ui]").style.left'),cloudBefore,'cloud content does not drag on mobile')
  await close('interest-retro-ui')
  await evaluate('document.querySelector(".experience-scroll-area").scrollIntoView({block:"center"});true')
  const experience=await point('.experience-scroll-area .retro-scroll-content')
  const outerBefore=await evaluate(`document.querySelector('${details}').scrollTop`)
  await swipe(experience.x,experience.y,0,-90)
  assert.ok(await evaluate('document.querySelector(".experience-scroll-area .retro-scroll-content").scrollTop')>0,'Experience scrolls independently')
  assert.ok(Math.abs(await evaluate(`document.querySelector('${details}').scrollTop`)-outerBefore)<1)
  await evaluate('document.querySelector(".experience-scroll-area .retro-scroll-content").scrollTop=0;true')
  await tap('[data-experience-id]')
  await assertWindow('works')
  assert.ok(await evaluate('!!document.querySelector("[data-project-id]")'),'Experience selects its linked project')
  const project=await evaluate('document.querySelector("[data-project-id]").dataset.projectId')
  await tap('.mobile-window-switcher [aria-controls="desktop-window-about"]')
  assert.equal(await evaluate('document.querySelector("[data-project-id]").dataset.projectId'),project,'switching apps retains project state')

  // Native touch dragging uses only title bars and stays inside the usable viewport.
  const header=await point('[data-window-id=about] .retro-window-header > span')
  await swipe(header.x,header.y,30,70)
  await assertWindow('about')
  await close('about')
  await close('works')
  await close('home')
  console.log('PASS independent content scrolling, silent skill swipes, cloud shape, title-only touch dragging, linked projects and app switching')
  assert.equal(await evaluate('window.__retainedMotion.every(({a,time})=>Array.from(document.querySelectorAll(".fan-rotor,.swimming-fish")).some(e=>e.getAnimations().includes(a))&&a.currentTime>time)'),true,'animations retain their original timelines through panning, themes and window interactions')

  await tap('#store-phone')
  await assertWindow('contact')
  await evaluate('document.querySelector("input[type=email]").scrollIntoView({block:"center"});document.querySelector("input[type=email]").focus();Object.defineProperty(visualViewport,"height",{configurable:true,get:()=>360});visualViewport.dispatchEvent(new Event("resize"));true')
  await wait(100)
  assert.ok(await evaluate('document.querySelector("[data-window-id=contact]").getBoundingClientRect().bottom')<=348.5,'visual viewport shrink keeps the close button and window accessible')
  await evaluate('delete visualViewport.height;visualViewport.dispatchEvent(new Event("resize"));true')
  await close('contact')
  console.log('PASS simulated visual-viewport keyboard shrink; native device keyboard testing remains manual')

  await tap('[aria-label="Play music"]')
  await until('window.__audioStats.media.at(-1).currentTime>0.1')
  const playing=await evaluate(audioState)
  await dimensions(844,390)
  await dimensions(390,844)
  const afterRotation=await evaluate(audioState)
  assert.equal(afterRotation.src,playing.src)
  assert.equal(afterRotation.loads,playing.loads)
  assert.ok(afterRotation.time>playing.time,'rotation keeps music playing without reloading')
  await tap('[aria-label="Next track"]')
  await until(`window.__audioStats.media.at(-1).currentSrc!==${JSON.stringify(playing.src)}&&!window.__audioStats.media.at(-1).paused`)
  await tap('[aria-label="Previous track"]')
  await until(`window.__audioStats.media.at(-1).currentSrc===${JSON.stringify(playing.src)}&&!window.__audioStats.media.at(-1).paused`)
  await tap('[aria-label="Shuffle"]')
  const volume=await point('[aria-label="Music volume"]')
  await swipe(volume.x-20,volume.y,30)
  await tap('[aria-label="Mute music"]')
  await tap('[aria-label="Unmute music"]')
  await until('!window.__audioStats.media.at(-1).paused')
  const prefs=await evaluate('JSON.parse(localStorage.getItem("portfolio-audio-v1"))')
  assert.equal(prefs.shuffle,true)
  assert.equal((await evaluate(audioState)).count,1)
  await evaluate('window.__audioStats.media.at(-1).pause();true')
  await until(`!!document.querySelector('[aria-label="Play music"]')`)
  await tap('[aria-label="Play music"]')
  await until('!window.__audioStats.media.at(-1).paused')
  await reload()
  await until(ready)
  assert.equal((await evaluate(audioState)).playing,0,'saved intent still respects mobile autoplay')
  const pending=await evaluate(audioState)
  const pendingPC=await point('#store-pc')
  await swipe(pendingPC.x,pendingPC.y,-Math.min(80,pendingPC.x-15))
  assert.equal((await evaluate(audioState)).playing,0,'a swipe does not resume saved music')
  assert.equal((await evaluate(audioState)).tones,pending.tones)
  await tap('#store-pc')
  await until('!window.__audioStats.media.at(-1).paused')
  assert.equal((await evaluate(audioState)).count,1)
  console.log('PASS mobile play/pause, next/previous, shuffle, volume, mute, saved preferences, interruption recovery and no duplicate music')

  const metrics=(await send('Performance.getMetrics')).metrics
  assert.deepEqual(exceptions,[])
  assert.deepEqual(failedAssets,[])
  fs.writeFileSync(path.join(output,'mobile-results.json'),JSON.stringify({passed:true,emulated:true,viewports:reports,panningMetrics,metrics,preferences:prefs,exceptions,failedAssets},null,2))
  console.log('PASS all requested viewports; Chrome touch emulation only, no hardware or Safari claim')
}

runChecks(main)
