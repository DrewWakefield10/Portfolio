// Dependency-free Chrome DevTools smoke checks. Start the production server first.
// CHROME_PATH can override the Windows default; optional URL argument defaults to localhost:3100.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawn } = require('node:child_process')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const url = process.argv[2] || 'http://localhost:3100'
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const output = path.resolve(process.env.TEST_OUTPUT_DIR || '.next/verification')
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-browser-'))
const scene = require('../lib/store-scene.json')
const musicLibrary = require('../lib/music-library.json')
function expectedMusicVolume(state, volume) {
  const file = decodeURIComponent(new URL(state.src).pathname)
  const track = musicLibrary.find(track => decodeURIComponent(track.src) === file)
  return volume * 0.475468 * (track?.gain ?? 1)
}
let browser, socket
const pending = new Map()
let sequence = 0
let mouseButtons = 0
const exceptions = []
const failedAssets = []
async function send(method, params = {}) {
  const id = ++sequence
  const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  socket.send(JSON.stringify({ id, method, params }))
  return response
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function until(expression, timeout = 10000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return
    await wait(100)
  }
  throw Error('Timed out: ' + expression)
}
async function mouse(x, y, type = 'mouseMoved') {
  if (type === 'mousePressed') mouseButtons = 1
  if (type === 'mouseReleased') mouseButtons = 0
  await send('Input.dispatchMouseEvent', { type, x, y, buttons: mouseButtons,
    button: type !== 'mouseMoved' || mouseButtons ? 'left' : 'none',
    ...(type !== 'mouseMoved' ? { clickCount: 1 } : {}) })
}
async function click(selector) {
  await revealHotspot(selector)
  await until(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!h&&e.contains(h)})()`)
  const rect = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}); if(!e) throw Error('Missing control'); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await mouse(rect.x, rect.y)
  await mouse(rect.x, rect.y, 'mousePressed')
  await mouse(rect.x, rect.y, 'mouseReleased')
  await wait(80)
}
async function revealHotspot(selector) {
  await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}),options=document.querySelector('.audio-options'),toggle=document.querySelector('.audio-options-toggle');if(!e||!options||!toggle||getComputedStyle(toggle).display==='none')return;if((e.closest('.audio-options')&&getComputedStyle(options).display==='none')||(e.matches('.store-hotspot')&&options.dataset.expanded==='true'))toggle.click();})()`)
  await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e?.matches('.store-hotspot'))return;const r=e.getBoundingClientRect();if(r.left<0||r.right>innerWidth)e.scrollIntoView({inline:'center',block:'nearest'});})()`)
  await wait(40)
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'))
}
async function dimensions(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
  // Let scene ResizeObservers preserve/clamp the old center before revealing a new hotspot.
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))')
}
async function moveWindow(id, left, top) {
  const start = await evaluate(`(() => {const e=document.querySelector('[data-window-id="${id}"]'),w=e.getBoundingClientRect(),r=e.querySelector('.retro-window-header').getBoundingClientRect();return {x:r.x+60,y:r.y+10,offsetX:r.x+60-w.left,offsetY:r.y+10-w.top}})()`)
  await mouse(start.x, start.y, 'mousePressed')
  await mouse(left + start.offsetX, top + start.offsetY)
  await mouse(left + start.offsetX, top + start.offsetY, 'mouseReleased')
  await wait(80)
}
async function ensureHome() {
  if (!await evaluate("!!document.querySelector('[data-window-id=home]')")) await click('#store-pc')
  await evaluate("document.querySelector('[data-window-id=home]').focus()")
}
async function verifyContinuousWallpaper() {
  await until('document.querySelector(".store-environment")?.dataset.active === "true"')
  assert.equal(await evaluate(`(() => {
    const core=Array.from(document.querySelectorAll('.fan-rotor,.swimming-fish'));
    const animations=core.flatMap(e=>e.getAnimations());
    if(core.length!==7||animations.length!==7)return false;
    window.__loopCheck=animations.map(a=>({a,time:a.currentTime,rate:a.playbackRate,duration:a.effect.getTiming().duration}));
    return animations.every(a=>a.effect.getTiming().iterations===Infinity&&a.playState==='running');
  })()`), true, 'fan and all fish must have running infinite loops with the actual motion preference')
  // Cross multiple complete cycles without making the suite wait several minutes.
  await evaluate(`window.__loopCheck.forEach(({a})=>a.updatePlaybackRate(64));true`)
  await wait(2300)
  assert.equal(await evaluate(`window.__loopCheck.every(({a,time,duration})=>a.playState==='running'&&a.currentTime>time+duration*2)`), true, 'motion continues beyond multiple complete cycles')
  await evaluate(`window.__loopCheck.forEach(({a,rate})=>a.updatePlaybackRate(rate));true`)
  const before=await evaluate(`Array.from(document.querySelectorAll('.fan-rotor,.swimming-fish'),e=>getComputedStyle(e).transform)`)
  await wait(350)
  const after=await evaluate(`Array.from(document.querySelectorAll('.fan-rotor,.swimming-fish'),e=>getComputedStyle(e).transform)`)
  assert.ok(before.every((transform,i)=>transform!==after[i]), 'all fan/fish transforms keep changing at their normal playback rate')
}
async function verifyInteractiveDesktop() {
  assert.equal(await evaluate('document.querySelectorAll(".retro-app-window").length'), 0)
  assert.equal((await (await fetch(url)).text()).includes('data-window-id="home"'), false, 'Home is absent from the server-rendered page')
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Wallpaper motion"],[aria-label="Test UI sound"],.lucide-bell,.lucide-bell-off').length`), 0)
  assert.equal(await evaluate(`document.querySelectorAll('.hotspot-tooltip').length`), 0)
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.store-hotspot')).every(e=>!e.textContent.trim()&&!e.hasAttribute('title')&&!!e.getAttribute('aria-label'))`), true, 'hotspots have accessible names without visible labels or native tooltips')
  assert.equal(await evaluate(`document.querySelector('#store-pc').getAttribute('aria-label')`), 'Open Home')
  await evaluate(`window.__hotspotMotion=Array.from(document.querySelectorAll('.environmental-motion')).flatMap(e=>e.getAnimations()).map(animation=>({animation,time:animation.currentTime}));true`)
  await screenshot('desktop-startup')
  for (const selector of ['#store-pc','[data-light=left]','[data-light=right]']) {
    const hover = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    await mouse(hover.x,hover.y)
    await until(`Number(getComputedStyle(document.querySelector('${selector} .hotspot-illumination')).opacity)>0`)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).cursor`), 'pointer')
    assert.equal(await evaluate(`document.querySelectorAll('.hotspot-tooltip').length`), 0)
  }
  await click('#store-pc')
  assert.equal(await evaluate(`document.querySelectorAll('[data-window-id=home]').length`), 1)
  assert.equal(await evaluate(`document.querySelector('#store-pc').getAttribute('aria-label')`), 'Close Home')
  assert.equal(await evaluate(`document.querySelectorAll('.hotspot-tooltip').length`), 0)
  await click('[aria-label="Open About"]')
  await moveWindow('about',850,60)
  const aboutPosition = await evaluate(`document.querySelector('[data-window-id=about]').style.cssText`)
  await click('#store-pc')
  assert.equal(await evaluate(`!!document.querySelector('[data-window-id=home]')`), false, 'PC closes Home behind About')
  assert.equal(await evaluate(`document.querySelector('[data-window-id=about]').style.cssText`), aboutPosition, 'PC leaves other windows unchanged')
  await click('#store-pc')
  assert.equal(await evaluate(`Number(document.querySelector('[data-window-id=home]').style.zIndex)>Number(document.querySelector('[data-window-id=about]').style.zIndex)`), true)
  await click('[data-window-id=home] [aria-label="Close window"]')
  assert.equal(await evaluate(`document.activeElement.id`), 'store-pc')
  await click('#store-pc')
  await click('#store-pc')
  await evaluate(`document.querySelector('[data-window-id=about]').focus()`)
  await click('[data-window-id=about] [aria-label="Close window"]')
  // Batch clicks exercise functional context updates, including state not yet committed to the DOM.
  await evaluate(`(() => {const e=document.querySelector('#store-pc');for(let i=0;i<6;i++)e.click()})()`)
  assert.equal(await evaluate(`!!document.querySelector('[data-window-id=home]')`), false)
  await evaluate(`(() => {const e=document.querySelector('#store-pc');for(let i=0;i<7;i++)e.click()})()`)
  assert.equal(await evaluate(`document.querySelectorAll('[data-window-id=home]').length`), 1)
  await click('#store-pc')
  await evaluate(`document.querySelector('#store-pc').focus()`)
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
  await until(`!!document.querySelector('[data-window-id=home]')`)
  await click('[data-window-id=home] [aria-label="Close window"]')
  assert.equal(await evaluate(`(() => {const current=Array.from(document.querySelectorAll('.environmental-motion')).flatMap(e=>e.getAnimations());return window.__hotspotMotion.length>0&&window.__hotspotMotion.every(({animation,time})=>current.includes(animation)&&animation.playState==='running'&&animation.currentTime>time)})()`), true, 'environmental animations retain their timelines and keep advancing across desktop interactions')
  console.log('PASS wallpaper-only startup, PC toggle behind other windows, X/reopen, rapid-click parity and keyboard activation')

  await evaluate(`document.querySelector('.fan-rotor').getAnimations()[0].id='retained';true`)
  await click('[data-light=left]')
  assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), true)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Toggle theme"]').title`), 'Switch to light mode')
  assert.equal(await evaluate(`document.querySelector('[data-light=left] .hotspot-illumination').getAnimations().length`), 1)
  assert.equal(await evaluate(`window.__audioStats.tones.at(-1).type`), 'triangle')
  await click('[data-light=right]')
  assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), false)
  await evaluate(`(() => {const e=document.querySelector('[data-light=left]');for(let i=0;i<4;i++)e.click()})()`)
  assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), false, 'rapid theme toggles preserve parity')
  assert.equal(await evaluate(`document.querySelector('.fan-rotor').getAnimations()[0].id`), 'retained')
  await click('[aria-label="UI sounds"]')
  await mouse(1800,1000)
  await wait(150)
  const silent = (await evaluate(audioState)).tones
  await click('[data-light=left]')
  assert.equal((await evaluate(audioState)).tones, silent, 'UI FX mute includes light-switch sounds')
  assert.equal(await evaluate(`localStorage.getItem('theme')`), 'dark')
  await reload()
  assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), true)
  assert.equal(await evaluate(`document.querySelectorAll('.retro-app-window').length`), 0)
  await click('[aria-label="Toggle theme"]')
  assert.equal(await evaluate(`document.querySelector('[data-light=left]').getAttribute('aria-label').includes('night')`), true)
  await click('[aria-label="UI sounds"]')
  await ensureHome()
  await click('[aria-label="Open About"]')
  await moveWindow('about',0,60)
  for (const selector of ['#store-pc','[data-light=left]']) {
    const covered = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,window:document.elementFromPoint(x,y).closest('[data-window-id]')?.dataset.windowId}})()`)
    assert.equal(covered.window,'about', 'application receives clicks above '+selector)
    await mouse(covered.x,covered.y,'mousePressed')
    await mouse(covered.x,covered.y,'mouseReleased')
    assert.equal(await evaluate(`!!document.querySelector('[data-window-id=home]')`), true)
    assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), false)
  }
  await click('[data-window-id=about] [aria-label="Close window"]')
  await click('#store-pc')
  console.log('PASS both light switches, shared navbar theme, saved theme, quiet switch feedback, mute and application hit testing')

  for (const [width,height] of [[1920,1080],[2560,1440],[3840,2160],[375,812],[667,375]]) {
    await dimensions(width,height)
    await wait(150)
    const alignment = await evaluate(`(() => {const map=document.querySelector('.store-hotspot-map').getBoundingClientRect(),m=document.querySelector('.store-environment').getScreenCTM(),pc=document.querySelector('#store-pc').getBoundingClientRect(),r=${JSON.stringify(scene.interactions.pc)};return {mapX:map.left,mapY:map.top,expectedX:m.e,expectedY:m.f,pcX:pc.left,pcY:pc.top,pcWidth:pc.width,ex:m.e+r.x*m.a,ey:m.f+r.y*m.d,ew:r.width*m.a}})()`)
    for(const [a,b] of [['mapX','expectedX'],['mapY','expectedY'],['pcX','ex'],['pcY','ey'],['pcWidth','ew']]) assert.ok(Math.abs(alignment[a]-alignment[b])<0.15, 'hotspot artwork alignment '+width+' '+a)
    await click('#store-pc')
    assert.equal(await evaluate(`!!document.querySelector('[data-window-id=home]')`), true)
    await click('[data-window-id=home] [aria-label="Close window"]')
    await click('[data-light=right]')
    assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), true)
    await click('[data-light=right]')
    assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), false)
  }
  await dimensions(375,812)
  await revealHotspot('#store-pc')
  const touch = await evaluate(`(() => {const r=document.querySelector('#store-pc').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touch,id:1}]})
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await until(`!!document.querySelector('[data-window-id=home]')`)
  await click('[data-window-id=home] [aria-label="Close window"]')
  await revealHotspot('[data-light=right]')
  const touchLight = await evaluate(`(() => {const r=document.querySelector('[data-light=right]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  for (const dark of [true,false]) {
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touchLight,id:1}]})
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    await until(`document.documentElement.classList.contains('dark')===${dark}`)
  }
  await dimensions(1920,1080)
  const range = await evaluate(`(() => {const e=document.querySelector('.pixel-volume'),r=e.getBoundingClientRect();return {x:r.left,y:r.top+r.height/2,width:r.width,radius:getComputedStyle(e).borderRadius}})()`)
  assert.equal(range.radius,'0px')
  await mouse(range.x+range.width/2,range.y,'mousePressed')
  await mouse(range.x+range.width*0.8,range.y)
  await mouse(range.x+range.width*0.8,range.y,'mouseReleased')
  assert.ok(await evaluate(`Number(document.querySelector('.pixel-volume').value)>65`))
  await evaluate(`document.querySelector('.pixel-volume').focus()`)
  for (const key of ['Home','End','ArrowLeft']) {
    const code = {Home:36,End:35,ArrowLeft:37}[key]
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code})
    assert.equal(await evaluate(`Number(document.querySelector('.pixel-volume').value)`), {Home:0,End:100,ArrowLeft:99}[key])
  }
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:range.x+range.width/4,y:range.y,id:1}]})
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:range.x+range.width/2,y:range.y,id:1}]})
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  assert.ok(await evaluate(`Number(document.querySelector('.pixel-volume').value)>35&&Number(document.querySelector('.pixel-volume').value)<65`))
  await evaluate(`(() => {const e=document.querySelector('.pixel-volume');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'50');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`)
  await ensureHome()
  console.log('PASS hotspot alignment and activation at 1080p/1440p/4K/mobile/landscape, touch PC, square segmented volume and mouse/touch/keyboard volume control')
}
async function verifyWallCalendar() {
  const date = await evaluate(`document.querySelector('[data-local-date]').dateTime`)
  await until(`document.querySelector('[data-wall-calendar]')?.dataset.wallCalendar===${JSON.stringify(date)}`)
  const [, month, day] = date.split('-').map(Number)
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-calendar-day]'),e=>e.textContent)`),[String(day),String(day)])
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-calendar-month]'),e=>e.textContent)`),[`${month}月`,`${month}月`])
  assert.equal(await evaluate(`(() => {const a=document.querySelector('[data-wall-calendar]').getScreenCTM(),b=document.querySelector('.store-environment').getScreenCTM();return ['a','b','c','d','e','f'].every(key=>Math.abs(a[key]-b[key])<0.001)})()`),true,'wall calendar stays aligned with artwork')
}
async function verifyWallpaperObjects() {
  await click('[data-window-id=home] [aria-label="Close window"]')
  await evaluate(`window.__objectMotions=Array.from(document.querySelectorAll('.environmental-motion')).flatMap(e=>e.getAnimations());true`)
  const objects = [['phone','contact','triangle',[420,440,460]],['clock','time','sine',[1040,1100,1160]],['calendar','calendar','triangle',[720,760,800]],['board','works','triangle',[720,760,800]]]
  for (const [id,,type,frequencies] of objects) {
    await mouse(1800,1000)
    await wait(150)
    const point = await evaluate(`(() => {const r=document.querySelector('#store-${id}').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    const count = (await evaluate(audioState)).tones
    await mouse(point.x,point.y)
    await until(`Number(getComputedStyle(document.querySelector('#store-${id} .hotspot-illumination')).opacity)>0`)
    assert.equal((await evaluate(audioState)).tones,count+1)
    const tone = await evaluate('window.__audioStats.tones.at(-1)')
    assert.equal(tone.type,type)
    assert.ok(frequencies.includes(tone.frequency), `${id} hover starts in its own tone family: ${tone.frequency}`)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('#store-${id}')).cursor`),'pointer')
    assert.equal(await evaluate(`document.querySelector('#store-${id}').textContent.trim()`),'')
  }
  await click('#store-phone')
  assert.equal(await evaluate(`document.querySelectorAll('[data-window-id=contact]').length`),1)
  await moveWindow('contact',20,60)
  const contactPosition = await evaluate(`document.querySelector('[data-window-id=contact]').style.cssText`)
  await click('#store-phone')
  assert.equal(await evaluate(`document.querySelectorAll('.retro-app-window').length`),0)
  await click('#store-phone')
  assert.equal(await evaluate(`document.querySelector('[data-window-id=contact]').style.cssText.replace(/z-index:[^;]+;/,'')`),contactPosition.replace(/z-index:[^;]+;/,''))
  await click('[data-window-id=contact] [aria-label="Close window"]')

  await click('#store-board')
  await moveWindow('works',20,60)
  await click('[data-window-id=works] [title="Retro Arcade"]')
  await click('#store-board')
  assert.equal(await evaluate(`!!document.querySelector('[data-window-id=works]')`),false)
  await click('#store-board')
  assert.equal(await evaluate(`document.querySelector('[data-window-id=works] [data-project-id]').dataset.projectId`),'1')
  await click('[data-window-id=works] [data-project-id] button')
  await click('#store-board')
  await evaluate(`for(let i=0;i<7;i++)document.querySelector('#store-board').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('[data-window-id=works]').length`),1)
  await click('[data-window-id=works] [aria-label="Close window"]')
  console.log('PASS telephone/board hover tones and glow, independent app toggles, dragging, project retention and no duplicates')

  await click('#store-clock')
  await click('#store-calendar')
  assert.equal(await evaluate(`document.querySelectorAll('.retro-info-window').length`),2)
  assert.equal(await evaluate(`document.querySelectorAll('[data-window-id=contact],[data-window-id=works]').length`),0)
  await moveWindow('time',20,60)
  await moveWindow('calendar',300,60)
  await click('#store-clock')
  assert.equal(await evaluate(`document.querySelectorAll('.retro-info-window').length`),1)
  assert.equal(await evaluate(`!!document.querySelector('[data-window-id=calendar]')`),true)
  await click('#store-clock')
  await click('#store-calendar')
  assert.equal(await evaluate(`document.querySelectorAll('.retro-info-window').length`),1)
  assert.equal(await evaluate(`!!document.querySelector('[data-window-id=time]')`),true)
  await click('#store-calendar')
  const stamp = await evaluate(`document.querySelector('[data-local-time]').dateTime`)
  await until(`document.querySelector('[data-local-time]').dateTime!==${JSON.stringify(stamp)}`)
  const accuracy = await evaluate(`(() => {const displayed=new Date(document.querySelector('[data-local-time]').dateTime),now=new Date(),hour=Number(document.querySelector('[data-clock-hand=hour]').getAttribute('transform').match(/rotate\\(([^ ]+)/)[1]),minute=Number(document.querySelector('[data-clock-hand=minute]').getAttribute('transform').match(/rotate\\(([^ ]+)/)[1]);return {age:Math.abs(now-displayed),time:document.querySelector('[data-local-time]').textContent,expected:displayed.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}),hour,minute,expectedHour:(displayed.getHours()%12+displayed.getMinutes()/60+displayed.getSeconds()/3600+displayed.getMilliseconds()/3600000)*30,expectedMinute:(displayed.getMinutes()+displayed.getSeconds()/60+displayed.getMilliseconds()/60000)*6,date:document.querySelector('[data-local-date]').dateTime,expectedDate:[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'),today:document.querySelector('td[aria-current=date]').textContent,expectedToday:String(now.getDate())}})()`)
  assert.ok(accuracy.age<1100)
  assert.equal(accuracy.time,accuracy.expected)
  assert.ok(Math.abs(accuracy.hour-accuracy.expectedHour)<0.001)
  assert.ok(Math.abs(accuracy.minute-accuracy.expectedMinute)<0.001)
  assert.equal(accuracy.date,accuracy.expectedDate)
  assert.equal(accuracy.today,accuracy.expectedToday)
  await verifyWallCalendar()
  for (const id of ['time','calendar']) {
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-window-id=${id}]')).backgroundColor`),'rgba(215, 224, 201, 0.7)')
  }
  await screenshot('store-information-day')
  await click('[aria-label="Toggle theme"]')
  assert.equal(await evaluate(`document.querySelectorAll('.retro-info-window').length`),2)
  for (const id of ['time','calendar']) {
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-window-id=${id}]')).backgroundColor`),'rgba(10, 35, 66, 0.7)')
  }
  await wait(700)
  await verifyWallCalendar()
  await screenshot('store-information-night')
  await click('[aria-label="Toggle theme"]')
  for (const id of ['time','calendar']) {
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-window-id=${id}]')).backgroundColor`),'rgba(215, 224, 201, 0.7)')
  }

  // Advance the visitor's local clock through real date boundaries, without waiting overnight.
  await evaluate(`window.__RealDate=Date;window.__testNow=new Date(2024,1,28,23,59,59).getTime();window.Date=class extends window.__RealDate{constructor(...args){super(...(args.length?args:[window.__testNow]))}static now(){return window.__testNow}};document.dispatchEvent(new Event('visibilitychange'))`)
  await until(`document.querySelector('[data-local-date]').dateTime==='2024-02-28'`)
  await verifyWallCalendar()
  await evaluate(`window.__testNow+=2000`)
  await until(`document.querySelector('[data-local-date]').dateTime==='2024-02-29'`)
  await verifyWallCalendar()
  assert.equal(await evaluate(`document.querySelector('td[aria-current=date]').textContent`),'29')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.store-calendar-grid td')).filter(e=>e.textContent.trim()).length`),29)
  for(const [year,month,day,key,days] of [[2024,2,1,'2024-03-01',31],[2026,11,31,'2026-12-31',31],[2027,0,1,'2027-01-01',31]]) {
    await evaluate(`window.__testNow=new window.__RealDate(${year},${month},${day},0,0,1).getTime();document.dispatchEvent(new Event('visibilitychange'))`)
    await until(`document.querySelector('[data-local-date]').dateTime==='${key}'`)
    await verifyWallCalendar()
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.store-calendar-grid td')).filter(e=>e.textContent.trim()).length`),days)
  }
  await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`)
  const frozenTime=await evaluate(`document.querySelector('[data-local-time]').dateTime`)
  await evaluate(`window.__testNow+=86400000`)
  await wait(1100)
  assert.equal(await evaluate(`document.querySelector('[data-local-time]').dateTime`),frozenTime)
  assert.equal(await evaluate(`document.querySelector('[data-local-date]').dateTime`),'2027-01-01')
  await verifyWallCalendar()
  await evaluate(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`)
  await until(`document.querySelector('[data-local-date]').dateTime==='2027-01-02'`)
  await verifyWallCalendar()
  assert.equal(await evaluate(`document.querySelector('.store-environment').dataset.running`),'true')
  for (const timezone of ['Asia/Taipei','America/New_York']) {
    await send('Emulation.setTimezoneOverride',{timezoneId:timezone})
    await evaluate(`window.__testNow=Date.UTC(2027,0,1,2,0,0)+('${timezone}'==='Asia/Taipei'?0:1);document.dispatchEvent(new Event('visibilitychange'))`)
    await until(`document.querySelector('.store-info-zone').textContent.includes('${timezone}')`)
    assert.equal(await evaluate(`document.querySelector('[data-local-date]').dateTime`),timezone==='Asia/Taipei'?'2027-01-01':'2026-12-31')
    await verifyWallCalendar()
    assert.match(await evaluate(`document.querySelector('[data-local-time]').textContent`),timezone==='Asia/Taipei'?/10:00:00 AM/:/09:00:00 PM/)
    assert.ok(await evaluate(`document.querySelector('.store-info-zone').textContent.includes('${timezone==='Asia/Taipei'?'UTC+08:00':'UTC-05:00'}')`))
  }
  await send('Emulation.setTimezoneOverride',{timezoneId:''})
  await evaluate(`window.Date=window.__RealDate;delete window.__RealDate;delete window.__testNow;document.dispatchEvent(new Event('visibilitychange'))`)
  console.log('PASS live seconds, shared SVG clock accuracy, local timezone offsets, leap day, month/year rollover and simultaneous compact popups')

  await moveWindow('time',1300,190)
  const covered = await evaluate(`(() => {const r=document.querySelector('#store-clock').getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,id:document.elementFromPoint(x,y).closest('[data-window-id]')?.dataset.windowId}})()`)
  assert.equal(covered.id,'time')
  await mouse(covered.x,covered.y,'mousePressed')
  await mouse(covered.x,covered.y,'mouseReleased')
  assert.equal(await evaluate(`document.querySelectorAll('.retro-info-window').length`),2,'popup receives clicks above wallpaper')
  await click('[data-window-id=time] [aria-label="Close window"]')
  assert.equal(await evaluate(`document.activeElement.id`),'store-clock')
  await click('[data-window-id=calendar] [aria-label="Close window"]')
  assert.equal(await evaluate(`document.activeElement.id`),'store-calendar')
  for(const [id,windowId] of [['clock','time'],['calendar','calendar']]) {
    await evaluate(`document.querySelector('#store-${id}').focus()`)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
    await until(`!!document.querySelector('[data-window-id=${windowId}]')`)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
    await until(`!document.querySelector('[data-window-id=${windowId}]')`)
    assert.equal(await evaluate(`document.activeElement.id`),'store-'+id)
  }
  await click('[aria-label="UI sounds"]')
  await mouse(1800,1000)
  await wait(150)
  const silent = (await evaluate(audioState)).tones
  await click('#store-clock')
  await click('[data-window-id=time] [aria-label="Close window"]')
  assert.equal((await evaluate(audioState)).tones,silent)
  await click('[aria-label="UI sounds"]')

  for(const [width,height] of [[1920,1080],[2560,1440],[3840,2160],[375,812],[667,375]]) {
    await dimensions(width,height)
    for(const dark of [false,true]) {
      if(await evaluate(`document.documentElement.classList.contains('dark')`)!==dark) await click('[aria-label="Toggle theme"]')
      for(const [id,windowId] of objects) {
        const box = scene.interactions[id]
        assert.equal(await evaluate(`(() => {const r=document.querySelector('#store-${id}').getBoundingClientRect(),m=document.querySelector('.store-environment').getScreenCTM();return Math.abs(r.left-(${box.x}*m.a+m.e))<0.15&&Math.abs(r.top-(${box.y}*m.d+m.f))<0.15&&Math.abs(r.width-${box.width}*m.a)<0.15&&Math.abs(r.height-${box.height}*m.d)<0.15})()`),true,`aligned ${id} ${width} ${dark}`)
        if(width===375&&(id==='clock'||id==='calendar')) {
          await revealHotspot('#store-'+id)
          const touch=await evaluate(`(() => {const r=document.querySelector('#store-${id}').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
          await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touch,id:1}]})
          await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
          await until(`!!document.querySelector('[data-window-id=${windowId}]')`)
        } else await click('#store-'+id)
        assert.equal(await evaluate(`document.querySelectorAll('[data-window-id=${windowId}]').length`),1)
        if(id==='calendar') await verifyWallCalendar()
        assert.equal(await evaluate(`(() => {const r=document.querySelector('[data-window-id=${windowId}]').getBoundingClientRect();return r.left>=-0.5&&r.top>=-0.5&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5})()`),true,'window stays in viewport')
        await click(`[data-window-id=${windowId}] [aria-label="Close window"]`)
      }
    }
  }
  await dimensions(1920,1080)
  await click('[aria-label="Toggle theme"]')
  assert.equal(await evaluate(`window.__objectMotions.every(a=>Array.from(document.querySelectorAll('.environmental-motion')).some(e=>e.getAnimations().includes(a))&&a.playState==='running')`),true,'new interactions retain continuous environmental timelines')
  assert.equal(await evaluate(`document.querySelectorAll('.retro-app-window').length`),0)
  await ensureHome()
  console.log('PASS popup occlusion, X/Escape focus return, keyboard/touch, effects mute, day/night alignment and viewport bounds through 4K/mobile/landscape')
}
async function verifyFanControls() {
  await click('[data-window-id=home] [aria-label="Close window"]')
  await until(`document.querySelector('#store-fan').dataset.fanSpeed==='low'&&Math.abs(document.querySelector('.fan-rotor').getAnimations()[0].playbackRate-4)<0.000001`)
  assert.equal(await evaluate(`document.querySelectorAll('.fan-rotor').length`),1)
  assert.equal(await evaluate(`document.querySelector('#store-fan').textContent.trim()`),'')
  assert.equal(await evaluate(`document.querySelector('#store-fan').hasAttribute('title')`),false)
  await evaluate(`window.__fanControl=document.querySelector('.fan-rotor').getAnimations()[0];window.__fanBody=document.querySelector('.fan-rotor').nextElementSibling.getBoundingClientRect().toJSON();true`)
  const fanPoint=await evaluate(`(() => {const r=document.querySelector('#store-fan').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  await mouse(fanPoint.x,fanPoint.y)
  await until(`Number(getComputedStyle(document.querySelector('#store-fan .hotspot-illumination')).opacity)>0`)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#store-fan')).cursor`),'pointer')
  let previousRate=4
  for(const [speed,rate] of [['medium',8],['high',16],['off',0]]) {
    await evaluate(`window.__fanSamples=[];window.__fanSampleDone=false;(() => {let start;const sample=t=>{start??=t;const a=window.__fanControl,m=new DOMMatrix(getComputedStyle(document.querySelector('.fan-rotor')).transform);window.__fanSamples.push({t,time:a.currentTime,angle:(Math.atan2(m.b,m.a)*180/Math.PI+360)%360});if(t-start<700)requestAnimationFrame(sample);else window.__fanSampleDone=true};requestAnimationFrame(sample)})();true`)
    await click('#store-fan')
    assert.equal(await evaluate(`document.querySelector('#store-fan').dataset.fanSpeed`),speed)
    assert.equal(await evaluate(`document.querySelector('.fan-rotor').dataset.fanSpeed`),speed)
    const partial=await evaluate(`window.__fanControl.playbackRate`)
    assert.ok(partial>Math.min(previousRate,rate)&&partial<Math.max(previousRate,rate),'speed ramps instead of switching instantly')
    assert.equal(await evaluate(`window.__audioStats.tones.at(-1).type`),'triangle')
    assert.ok([380,420,460].includes(await evaluate(`window.__audioStats.tones.at(-1).frequency`)))
    await until('window.__fanSampleDone')
    assert.equal(await evaluate(`window.__fanControl.playbackRate`),rate)
    const samples=await evaluate('window.__fanSamples')
    for(let i=1;i<samples.length;i++) {
      const a=samples[i-1],b=samples[i],delta=b.time-a.time
      assert.ok(delta>=-0.1&&delta<=(b.t-a.t)*16+15,'blade timeline neither resets nor jumps during a ramp')
      const angle=(b.angle-a.angle+360)%360,expected=(delta*0.36)%360
      assert.ok(Math.min(Math.abs(angle-expected),360-Math.abs(angle-expected))<0.1,'blade angle follows the continuous timeline')
    }
    previousRate=rate
  }
  const stopped=await evaluate(`({time:window.__fanControl.currentTime,transform:getComputedStyle(document.querySelector('.fan-rotor')).transform,fish:getComputedStyle(document.querySelector('.swimming-fish')).transform,clock:document.querySelector('[data-clock-hand=minute]').getAttribute('transform')})`)
  await wait(1100)
  assert.equal(await evaluate('window.__fanControl.currentTime'),stopped.time)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fan-rotor')).transform`),stopped.transform)
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.swimming-fish')).transform`),stopped.fish)
  assert.notEqual(await evaluate(`document.querySelector('[data-clock-hand=minute]').getAttribute('transform')`),stopped.clock)
  assert.deepEqual(await evaluate(`document.querySelector('.fan-rotor').nextElementSibling.getBoundingClientRect().toJSON()`),await evaluate('window.__fanBody'),'fan body stays fixed')
  await reload()
  await until(`document.querySelector('#store-fan').dataset.fanSpeed==='off'&&document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===0`)
  await click('#store-fan')
  await until(`document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===4`)
  await evaluate(`for(let i=0;i<2;i++)document.querySelector('#store-fan').click()`)
  await until(`document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===16`)
  await evaluate(`window.__fanControl=document.querySelector('.fan-rotor').getAnimations()[0]`)
  await click('[aria-label="Toggle theme"]')
  await wait(600)
  assert.equal(await evaluate(`window.__fanControl===document.querySelector('.fan-rotor').getAnimations()[0]&&window.__fanControl.playbackRate===16`),true)
  await click('[aria-label="Toggle theme"]')
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('portfolio-fan-speeds-v1'))['shelf-fan']`),'high')
  await reload()
  await until(`document.querySelector('#store-fan').dataset.fanSpeed==='high'&&document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===16`)
  await evaluate(`for(let i=0;i<8;i++)document.querySelector('#store-fan').click()`)
  assert.equal(await evaluate(`document.querySelector('#store-fan').dataset.fanSpeed`),'high')
  await evaluate(`for(let i=0;i<9;i++)document.querySelector('#store-fan').click()`)
  await until(`document.querySelector('#store-fan').dataset.fanSpeed==='off'&&document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===0`)
  await click('#store-fan')
  await until(`document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===4`)
  console.log('PASS fan default Low, 240/480/960 RPM, smooth ramps with continuous angles, fan-only Off, saved Off/High and rapid-click parity')

  await click('#store-clock')
  await moveWindow('time',910,150)
  assert.equal(await evaluate(`document.elementFromPoint(${fanPoint.x},${fanPoint.y}).closest('[data-window-id]')?.dataset.windowId`),'time')
  await mouse(fanPoint.x,fanPoint.y,'mousePressed')
  await mouse(fanPoint.x,fanPoint.y,'mouseReleased')
  assert.equal(await evaluate(`document.querySelector('#store-fan').dataset.fanSpeed`),'low')
  await click('[data-window-id=time] [aria-label="Close window"]')
  await click('[aria-label="UI sounds"]')
  const silent=(await evaluate(audioState)).tones
  await click('#store-fan')
  assert.equal((await evaluate(audioState)).tones,silent,'UI FX mute silences fan activations')
  await evaluate(`for(let i=0;i<3;i++)document.querySelector('#store-fan').click()`)
  await click('[aria-label="UI sounds"]')
  await evaluate(`document.querySelector('#store-fan').focus()`)
  for(const [key,code,virtual,speed] of [['Enter','Enter',13,'medium'],[' ','Space',32,'high']]) {
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtual,text:key==='Enter'?'\r':' '})
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtual})
    await until(`document.querySelector('#store-fan').dataset.fanSpeed==='${speed}'`)
  }
  await until(`document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===16`)
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await until(`Math.abs(document.querySelector('.fan-rotor').getAnimations()[0].playbackRate-4/3)<0.000001`)
  assert.equal(await evaluate(`document.querySelector('#store-fan').dataset.fanSpeed`),'high')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
  await until(`document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===16`)

  for(const [width,height] of [[1920,1080],[2560,1440],[3840,2160],[375,812],[667,375]]) {
    await dimensions(width,height)
    for(const dark of [false,true]) {
      if(await evaluate(`document.documentElement.classList.contains('dark')`)!==dark) await click('[aria-label="Toggle theme"]')
      const box=scene.interactions.fan
      assert.equal(await evaluate(`(() => {const r=document.querySelector('#store-fan').getBoundingClientRect(),m=document.querySelector('.store-environment').getScreenCTM();return Math.abs(r.left-(${box.x}*m.a+m.e))<0.15&&Math.abs(r.top-(${box.y}*m.d+m.f))<0.15&&Math.abs(r.width-${box.width}*m.a)<0.15&&Math.abs(r.height-${box.height}*m.d)<0.15})()`),true,'fan hotspot matches artwork '+width)
      const before=await evaluate(`document.querySelector('#store-fan').dataset.fanSpeed`)
      if(width===375) {
        await revealHotspot('#store-fan')
        const touch=await evaluate(`(() => {const r=document.querySelector('#store-fan').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
        await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touch,id:1}]})
        await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
        await until(`document.querySelector('#store-fan').dataset.fanSpeed!==${JSON.stringify(before)}`)
      } else await click('#store-fan')
      assert.equal(await evaluate(`document.querySelector('#store-fan').dataset.fanSpeed`),{off:'low',low:'medium',medium:'high',high:'off'}[before])
    }
  }
  await dimensions(1920,1080)
  await click('[aria-label="Toggle theme"]')
  await evaluate(`localStorage.setItem('portfolio-fan-speeds-v1','{"shelf-fan":"invalid"}')`)
  await reload()
  await until(`document.querySelector('#store-fan').dataset.fanSpeed==='low'&&document.querySelector('.fan-rotor').getAnimations()[0].playbackRate===4`)
  await ensureHome()
  console.log('PASS fan keyboard/touch, window occlusion, mute, gentler reduced-motion speeds, day/night alignment through 4K/mobile and invalid-preference fallback')
}
async function verifyDesktopUi() {
  await ensureHome()
  await moveWindow('home',720,360)
  const launcher = await evaluate(`(() => {const e=document.querySelector('.home-launcher'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,background:s.backgroundColor,opacity:s.opacity,blur:s.backdropFilter}})()`)
  assert.ok(launcher.width <= 500 && launcher.height <= 350, 'compact content-fitted launcher including its footer')
  assert.equal(launcher.background, 'rgba(215, 224, 201, 0.7)')
  assert.equal(launcher.opacity, '1')
  assert.equal(launcher.blur, 'none')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.desktop-navigation button,.desktop-navigation select')).every(e=>{const s=getComputedStyle(e);return s.borderTopWidth==='0px'&&s.boxShadow==='none'})`), true)
  await send('Input.dispatchKeyEvent', { type:'keyDown', key:'Tab', code:'Tab', windowsVirtualKeyCode:9 })
  await send('Input.dispatchKeyEvent', { type:'keyUp', key:'Tab', code:'Tab', windowsVirtualKeyCode:9 })
  await evaluate(`document.querySelector('[aria-label="Toggle theme"]').focus()`)
  assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`), 'solid')
  console.log('PASS compact 70% glass launcher, borderless desktop controls and keyboard focus')

  await click('[aria-label="Open About"]')
  await moveWindow('about', 0, 80)
  await click('[aria-label="Open Work"]')
  await click('[aria-label="Open Contact"]')
  assert.equal(await evaluate('document.querySelectorAll(".retro-app-window").length'), 4)
  const windows = await evaluate(`Array.from(document.querySelectorAll('.retro-app-window'),e=>({background:getComputedStyle(e).backgroundColor,body:getComputedStyle(e.querySelector('.retro-window-body')).backgroundColor,overflow:e.scrollWidth>e.clientWidth,text:parseFloat(getComputedStyle(e.querySelector('.retro-window-body')).fontSize)}))`)
  assert.ok(windows.every(e=>e.background===launcher.background && e.body==='rgba(0, 0, 0, 0)' && !e.overflow && e.text>=18))
  await mouse(10, 200, 'mousePressed')
  await mouse(10, 200, 'mouseReleased')
  const focused = await evaluate(`(() => {const es=Array.from(document.querySelectorAll('.retro-app-window'));return es.every(e=>e.dataset.windowId==='about'||Number(e.style.zIndex)<Number(document.querySelector('[data-window-id=about]').style.zIndex))})()`)
  assert.equal(focused, true, 'clicking window content brings it forward')
  const aboutPosition = await evaluate(`(() => {const r=document.querySelector('[data-window-id=about]').getBoundingClientRect();return {x:r.x,y:r.y}})()`)
  await click('[data-window-id=about] [aria-label="Close window"]')
  await evaluate(`document.querySelector('[data-window-id=contact] .retro-scroll-content').focus()`)
  await moveWindow('contact', 0, 60)
  await evaluate(`document.querySelector('[data-window-id=works] .retro-scroll-content').focus()`)
  await moveWindow('works', 0, 100)
  await click('[aria-label="Open About"]')
  await until('!!document.querySelector("[data-window-id=about]")')
  assert.deepEqual(await evaluate(`(() => {const r=document.querySelector('[data-window-id=about]').getBoundingClientRect();return {x:r.x,y:r.y}})()`), aboutPosition)
  assert.equal(await evaluate(`Number(document.querySelector('[data-window-id=about]').style.zIndex)===Math.max(...Array.from(document.querySelectorAll('.retro-app-window'),e=>Number(e.style.zIndex)))`), true)
  const scroll = await evaluate(`(() => {const e=document.querySelector('[data-window-id=about] .retro-scroll-content');e.scrollTop=100;return e.scrollTop})()`)
  assert.ok(scroll>0)
  await until(`!!document.querySelector('[aria-label="About details"] + .retro-scroll-track .retro-scroll-thumb')`)
  const thumb = await evaluate(`(() => {const r=document.querySelector('[aria-label="About details"] + .retro-scroll-track .retro-scroll-thumb').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await mouse(thumb.x,thumb.y,'mousePressed')
  await mouse(thumb.x,thumb.y+40)
  await mouse(thumb.x,thumb.y+40,'mouseReleased')
  assert.ok(await evaluate(`document.querySelector('[data-window-id=about] .retro-scroll-content').scrollTop > ${scroll}`))
  await screenshot('ui-about-day')
  console.log('PASS overlapping windows, body focus, reopening position and custom scrollbar dragging')

  await evaluate(`document.querySelector('[data-window-id=works] .retro-scroll-content').focus()`)
  await click('[data-window-id=works] button[title="Retro Arcade"]')
  assert.ok(await evaluate(`document.querySelector('[data-window-id=works]').textContent.includes('Tech:')`))
  await screenshot('ui-work-day')
  await click('[data-window-id=works] .retro-window-body .retro-button')
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("[data-window-id=works] button[title]"),e=>e.title)'), ['Lakbay', 'Retro Arcade', 'Portfolio Website'])
  await evaluate(`document.querySelector('[data-window-id=contact] .retro-scroll-content').focus()`)
  assert.equal(await evaluate('document.querySelectorAll("[data-window-id=contact] label").length'), 2)
  await screenshot('ui-contact-day')
  await click('[aria-label="Toggle theme"]')
  await wait(700)
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.retro-surface')).every(e=>getComputedStyle(e).backgroundColor==='rgba(10, 35, 66, 0.7)')`), true, 'all windows follow the dark-blue palette')
  assert.ok(await evaluate(`document.querySelector('.home-launcher img').getAttribute('src').includes('dark.png')`))
  await screenshot('ui-contact-night')
  await click('[aria-label="Toggle theme"]')
  await wait(700)
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.retro-surface')).every(e=>getComputedStyle(e).backgroundColor==='rgba(215, 224, 201, 0.7)')`), true, 'all windows return to leaf green')
  assert.ok(await evaluate(`document.querySelector('.home-launcher img').getAttribute('src').includes('light.png')`))

  for(const [width,height,label] of [[375,812,'mobile'],[667,375,'landscape']]) {
    await dimensions(width,height)
    await wait(250)
    const fits=await evaluate(`Array.from(document.querySelectorAll('.retro-app-window'),e=>{const r=e.getBoundingClientRect();return r.left>=-0.5&&r.top>=-0.5&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5&&Array.from(e.querySelectorAll('.retro-scroll-content')).every(s=>s.scrollWidth<=s.clientWidth+1)})`)
    assert.ok(fits.every(Boolean),'application windows fit '+label)
    assert.equal(await evaluate(`(() => {const r=document.querySelector('.home-launcher').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1})()`),true,'launcher fits desktop area in '+label)
    if(label==='mobile') {
      const header=await evaluate(`(() => {const r=document.querySelector('[data-window-id=contact] .retro-window-header').getBoundingClientRect();return {x:r.left+60,y:r.top+12,top:r.top}})()`)
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:header.x,y:header.y,id:1}]})
      await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:header.x,y:header.y+20,id:1}]})
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
      await wait(80)
      assert.ok(await evaluate(`document.querySelector('[data-window-id=contact]').getBoundingClientRect().top >= ${header.top+15}`),'touch header dragging within mobile bounds')
    }
    await screenshot('ui-applications-'+label)
  }
  await dimensions(1920,1080)
  for(let i=0;i<4;i++) {
    const id=await evaluate(`Array.from(document.querySelectorAll('.retro-app-window')).sort((a,b)=>Number(b.style.zIndex)-Number(a.style.zIndex))[0].dataset.windowId`)
    await click(`[data-window-id="${id}"] [aria-label="Close window"]`)
  }
  console.log('PASS project navigation, contact typography, glass in both themes, touch dragging and mobile/landscape window bounds')
}
async function verifyAboutInteractions() {
  await ensureHome()
  await click('[aria-label="Open About"]')
  await moveWindow('about', 20, 80)
  await evaluate(`document.querySelector('[data-window-id=about] .retro-scroll-content').scrollTop=0`)
  await mouse(1800, 1000)
  await wait(160)
  const skill = await evaluate(`(() => {const r=document.querySelector('.skill-item span').getBoundingClientRect();return {x:r.left+5,y:r.top+5}})()`)
  const before = (await evaluate(audioState)).tones
  await mouse(skill.x, skill.y)
  await wait(120)
  assert.equal((await evaluate(audioState)).tones, before + 1, 'one skill sound, no simultaneous global hover')
  assert.equal(await evaluate('window.__audioStats.tones.at(-1).type'), 'triangle')
  await mouse(skill.x + 2, skill.y + 2)
  await wait(120)
  assert.equal((await evaluate(audioState)).tones, before + 1, 'moving inside a skill stays silent')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.skill-item')).transform`), 'matrix(1, 0, 0, 1, 2, 0)')
  await click('[aria-label="UI sounds"]')
  const muted = (await evaluate(audioState)).tones
  await mouse(1800, 1000)
  await mouse(skill.x, skill.y)
  await wait(120)
  assert.equal((await evaluate(audioState)).tones, muted)
  await click('[aria-label="UI sounds"]')
  console.log('PASS dedicated skill waveform, once-per-entry feedback and global mute')

  const reveal = async selector => {
    await evaluate(`document.querySelector('[data-window-id=about]').focus();document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`)
    await wait(100)
  }
  const ids = ['linux', 'retro-ui', 'game-development', 'open-source', 'web-design']
  assert.equal(await evaluate(`document.querySelectorAll('.interest-button [role=tooltip]').length`), 0, 'visible interest labels need no duplicate tooltip')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.interest-button')).every(e=>e.querySelectorAll('span').length===1)`), true)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.interest-button .interest-icon path')).fill`), 'rgb(135, 164, 119)', 'plant-green icons in light mode')
  for (const id of ids) {
    await reveal('#interest-trigger-' + id)
    await click('#interest-trigger-' + id)
    const selector = `[data-window-id="interest-${id}"]`
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).contains(document.activeElement)`), true)
    assert.ok(await evaluate(`document.querySelector(${JSON.stringify(selector + ' p')}).textContent.length > 100`))
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector + ' svg')}).getAttribute('shape-rendering')`), 'crispEdges')
    assert.equal(await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return e.classList.contains('retro-cloud-window')&&e.getAttribute('role')==='dialog'&&r.width<=320&&r.height<350&&getComputedStyle(e).boxShadow==='none'&&getComputedStyle(e.querySelector('.retro-window-header')).backgroundImage==='none'})()`), true, 'compact cloud silhouette replaces app-window chrome')
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelectorAll('.interest-icon').length`), 0, 'interest icons appear only on launch buttons')
    assert.equal(await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}),p=e.querySelector('.interest-cloud-shape path'),m=p.getScreenCTM().inverse();return Array.from(e.querySelectorAll('.retro-window-header button')).every(c=>{const r=c.getBoundingClientRect();return [[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].every(([x,y])=>p.isPointInFill(new DOMPoint(x,y).matrixTransform(m)))})})()`), true, 'close control sits within the cloud outline')
    for (const area of ['body', 'padding']) {
      const drag = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect(),p=e.querySelector('p').getBoundingClientRect();return {left:r.left,top:r.top,x:${area === 'body' ? 'p.left+p.width/2' : 'r.left+r.width/2'},y:${area === 'body' ? 'p.top+p.height/2' : 'r.top+18'}}})()`)
      await mouse(drag.x,drag.y,'mousePressed')
      await mouse(drag.x+40,drag.y+30)
      await mouse(drag.x+40,drag.y+30,'mouseReleased')
      await wait(80)
      assert.equal(await evaluate(`Math.round(document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().left)`), Math.round(drag.left+40), area+' drag moves the cloud horizontally')
      assert.equal(await evaluate(`Math.round(document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top)`), Math.round(drag.top+30), area+' drag moves the cloud vertically')
    }
    await moveWindow('interest-' + id, 850, 120 + ids.indexOf(id) * 50)
  }
  const linuxPosition = await evaluate(`document.querySelector('[data-window-id="interest-linux"]').getBoundingClientRect().left`)
  await reveal('#interest-trigger-linux')
  await click('#interest-trigger-linux')
  assert.equal(await evaluate(`document.querySelectorAll('[data-window-id="interest-linux"]').length`), 1)
  assert.equal(await evaluate(`Number(document.querySelector('[data-window-id="interest-linux"]').style.zIndex)===Math.max(...Array.from(document.querySelectorAll('.retro-app-window'),e=>Number(e.style.zIndex)))`), true)
  assert.equal(await evaluate(`document.querySelector('[data-window-id="interest-linux"]').getBoundingClientRect().left`), linuxPosition)
  const touchDrag = await evaluate(`(() => {const e=document.querySelector('[data-window-id="interest-linux"]'),r=e.getBoundingClientRect(),p=e.querySelector('p').getBoundingClientRect();return {left:r.left,top:r.top,x:p.left+20,y:p.top+20}})()`)
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchDrag.x,y:touchDrag.y,id:1}]})
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchDrag.x+30,y:touchDrag.y+20,id:1}]})
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await wait(80)
  assert.equal(await evaluate(`Math.round(document.querySelector('[data-window-id="interest-linux"]').getBoundingClientRect().left)`), Math.round(touchDrag.left+30), 'touch dragging works from cloud description')
  await screenshot('about-interests-day')
  await click('[aria-label="Toggle theme"]')
  await wait(700)
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.interest-cloud-shape path')).every(e=>getComputedStyle(e).fill==='rgb(16, 47, 80)')`), true)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.interest-button .interest-icon path')).fill`), 'rgb(0, 185, 228)', 'blue icons in dark mode')
  await screenshot('about-interests-night')
  await click('[aria-label="Toggle theme"]')
  await wait(700)
  for (const [width,height] of [[375,812],[667,375]]) {
    await dimensions(width,height)
    await wait(250)
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.retro-mini-window')).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1})`), true)
    await screenshot(`about-mini-${width}`)
  }
  await dimensions(1920,1080)
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.retro-cloud-window')).animationName`), 'none')
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
  // Escape closes the focused mini window and returns keyboard focus to its trigger.
  await evaluate(`document.querySelector('[data-window-id="interest-linux"]').focus()`)
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  assert.equal(await evaluate(`!!document.querySelector('[data-window-id="interest-linux"]')`), false)
  assert.equal(await evaluate('document.activeElement.id'), 'interest-trigger-linux')
  // Enter reopens the focused interest button, without using a pointer.
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'})
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
  await until(`!!document.querySelector('[data-window-id="interest-linux"]')`)
  for (const id of ids) {
    await evaluate(`document.querySelector('[data-window-id="interest-${id}"]').focus()`)
    await click(`[data-window-id="interest-${id}"] [aria-label="Close window"]`)
  }
  console.log('PASS single interest labels, green/blue launch icons, clouds without icons, body/padding/touch dragging, reuse, keyboard close/reopen, reduced motion and small viewports')

  await reveal('.experience-scroll-area')
  const scrollState = await evaluate(`(() => {const e=document.querySelector('.experience-scroll-area .retro-scroll-content'),o=document.querySelector('[aria-label="About details"]'),r=e.getBoundingClientRect();e.scrollTop=0;return {outer:o.scrollTop,height:e.clientHeight,total:e.scrollHeight,x:r.left+40,y:r.top+40}})()`)
  assert.ok(scrollState.height<=250 && scrollState.total>scrollState.height)
  await mouse(scrollState.x,scrollState.y)
  await send('Input.dispatchMouseEvent', {type:'mouseWheel',x:scrollState.x,y:scrollState.y,deltaX:0,deltaY:180})
  await until(`document.querySelector('.experience-scroll-area .retro-scroll-content').scrollTop>0`)
  assert.equal(await evaluate(`document.querySelector('[aria-label="About details"]').scrollTop`), scrollState.outer, 'experience wheel scroll leaves About scroll unchanged')
  await evaluate(`const e=document.querySelector('.experience-scroll-area .retro-scroll-content');e.scrollTop=e.scrollHeight`)
  await send('Input.dispatchMouseEvent', {type:'mouseWheel',x:scrollState.x,y:scrollState.y,deltaX:0,deltaY:300})
  await wait(150)
  assert.equal(await evaluate(`document.querySelector('[aria-label="About details"]').scrollTop`), scrollState.outer, 'scroll chaining is contained at the end of the experience list')
  await evaluate(`document.querySelector('.experience-scroll-area .retro-scroll-content').focus()`)
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36})
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36})
  await until(`document.querySelector('.experience-scroll-area .retro-scroll-content').scrollTop===0`)
  const experienceThumb = await evaluate(`(() => {const r=document.querySelector('.experience-scroll-area .retro-scroll-thumb').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
  await mouse(experienceThumb.x,experienceThumb.y,'mousePressed')
  await mouse(experienceThumb.x,experienceThumb.y+30)
  await mouse(experienceThumb.x,experienceThumb.y+30,'mouseReleased')
  assert.ok(await evaluate(`document.querySelector('.experience-scroll-area .retro-scroll-content').scrollTop>0`))
  assert.equal(await evaluate(`document.querySelector('[aria-label="About details"]').scrollTop`), scrollState.outer)
  await screenshot('about-experience-scroll')
  console.log('PASS contained 250px experience list, independent wheel/keyboard/retro-thumb scrolling and no scroll chaining')

  const entries = await evaluate(`Array.from(document.querySelectorAll('[data-experience-id]'),e=>e.textContent)`)
  assert.equal(entries.length, 5)
  await wait(2800)
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-experience-id]'),e=>e.textContent)`), entries, 'experience content never auto-rotates')
  assert.equal(await evaluate(`document.querySelectorAll('article[data-experience-id]').length`), 2)
  for (const [id,projectId,title] of [['portfolio-development','2','Portfolio Website'],['game-development-projects','1','Retro Arcade'],['retro-desktop-website','2','Portfolio Website']]) {
    await reveal(`[data-experience-id="${id}"]`)
    await click(`[data-experience-id="${id}"]`)
    await until(`!!document.querySelector('[data-window-id=works] [data-project-id="${projectId}"]')`)
    assert.ok(await evaluate(`document.querySelector('[data-window-id=works]').textContent.includes(${JSON.stringify(title)})`))
    assert.equal(await evaluate(`document.querySelectorAll('[data-window-id=works]').length`), 1)
    assert.equal(await evaluate(`Number(document.querySelector('[data-window-id=works]').style.zIndex)===Math.max(...Array.from(document.querySelectorAll('.retro-app-window'),e=>Number(e.style.zIndex)))`), true)
    if (id==='portfolio-development') await moveWindow('works',850,80)
  }
  await screenshot('about-project-navigation')
  await click('[data-window-id=works] .retro-window-body .retro-button')
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-window-id=works] button[title]'),e=>e.title)`), ['Lakbay', 'Retro Arcade', 'Portfolio Website'])
  await click('[data-window-id=works] [aria-label="Close window"]')
  await reveal('[data-experience-id="authentication-dashboard"]')
  const missing = await evaluate(`(() => {const r=document.querySelector('[data-experience-id="authentication-dashboard"]').getBoundingClientRect();return {x:r.left+10,y:r.top+10}})()`)
  await mouse(missing.x,missing.y,'mousePressed')
  await mouse(missing.x,missing.y,'mouseReleased')
  assert.equal(await evaluate(`!!document.querySelector('[data-window-id=works]')`), false)
  await screenshot('about-experience-list')
  await click('[data-window-id=about] [aria-label="Close window"]')
  console.log('PASS five stable experience entries, correct project selection/reuse, preserved project catalog and safe missing mappings')
}
async function reload() {
  // Page.reload can return while the old document still satisfies readiness.
  await evaluate('window.__reloadPending = true')
  await send('Page.reload')
  await until(ready)
}
const audioState = `(() => { const a=window.__audioStats.media.at(-1); return {count:window.__audioStats.media.length, loads:window.__audioStats.loads, playing:window.__audioStats.media.filter(a=>!a.paused).length,paused:a.paused,muted:a.muted,volume:a.volume,time:a.currentTime,src:a.currentSrc,tones:window.__audioStats.tones.length} })()`

async function verifySuppliedMusic() {
  const fileOf = state => decodeURIComponent(new URL(state.src).pathname)
  if (await evaluate(`!!document.querySelector('[aria-label="Pause music"]')`)) await click('[aria-label="Pause music"]')
  if (await evaluate(`document.querySelector('[aria-label="Shuffle"]').getAttribute('aria-pressed')==='true'`)) await click('[aria-label="Shuffle"]')
  for (const theme of ['light', 'dark']) {
    if (await evaluate(`document.documentElement.classList.contains('dark')`) !== (theme === 'dark')) await click('[aria-label="Toggle theme"]')
    await until('window.__audioStats.media.at(-1).readyState >= 1')
    const expected = musicLibrary.filter(track => track.theme === theme)
    assert.equal(expected.length, 4)
    const visited = new Set()
    await click('[aria-label="Play music"]')
    let previous
    for (let index = 0; index < expected.length; index++) {
      await until('window.__audioStats.media.at(-1).currentTime > 0.1 && !window.__audioStats.media.at(-1).paused')
      await wait(900)
      const state = await evaluate(audioState)
      const file = fileOf(state)
      assert.ok(expected.some(track => decodeURIComponent(track.src) === file))
      assert.ok(!visited.has(file), 'sequential cycle visits each song exactly once')
      visited.add(file)
      assert.equal(state.count, 1)
      assert.equal(state.playing, 1)
      const userVolume = await evaluate(`Number(document.querySelector('[aria-label="Music volume"]').value)/100`)
      assert.ok(Math.abs(state.volume - expectedMusicVolume(state, userVolume)) < 0.0001)
      const track = expected.find(track => decodeURIComponent(track.src) === file)
      if (track) assert.ok((await evaluate(`document.querySelector('[data-music-controls]').textContent`)).includes(track.title))
      if (index < expected.length - 1) {
        previous = file
        await click('[aria-label="Next track"]')
        await until(`window.__audioStats.media.at(-1).currentSrc !== ${JSON.stringify(state.src)}`)
      }
    }
    assert.equal(visited.size, expected.length)
    const last = fileOf(await evaluate(audioState))
    await click('[aria-label="Previous track"]')
    await until(`decodeURIComponent(new URL(window.__audioStats.media.at(-1).currentSrc).pathname) === ${JSON.stringify(previous)}`)
    await wait(900)
    await click('[aria-label="Next track"]')
    await until(`decodeURIComponent(new URL(window.__audioStats.media.at(-1).currentSrc).pathname) === ${JSON.stringify(last)}`)
    await wait(1000)
    const beforeEnd = await evaluate(audioState)
    await evaluate(`(() => {const a=window.__audioStats.media.at(-1);a.currentTime=a.duration-0.1;})()`)
    await until(`window.__audioStats.media.at(-1).currentSrc !== ${JSON.stringify(beforeEnd.src)} && !window.__audioStats.media.at(-1).paused`)
    await wait(900)
    assert.equal((await evaluate(audioState)).playing, 1, 'native ended event advances to the next actual song')
    await click('[aria-label="Pause music"]')
  }
  await click('[aria-label="Play music"]')
  await until('window.__audioStats.media.at(-1).currentTime > 0.1')
  const shared = await evaluate(audioState)
  await click('[aria-label="Toggle theme"]')
  await wait(1800)
  let state = await evaluate(audioState)
  assert.ok(musicLibrary.some(track => track.theme === 'light' && decodeURIComponent(track.src) === fileOf(state)))
  assert.equal(state.loads, shared.loads + 1)
  assert.equal(state.count, 1)
  assert.equal(state.playing, 1)

  await ensureHome()
  const stable = await evaluate(audioState)
  await click('button.group')
  await moveWindow('about', 340, 120)
  await click('[data-window-id=about] [aria-label="Close window"]')
  state = await evaluate(audioState)
  assert.equal(state.src, stable.src)
  assert.equal(state.loads, stable.loads)
  assert.equal(state.playing, 1)
  assert.ok(state.time > stable.time)

  await click('[aria-label="Shuffle"]')
  const seen = new Set([fileOf(state)])
  for (let index = 0; index < 3; index++) {
    const before = await evaluate(audioState)
    await click('[aria-label="Next track"]')
    await until(`window.__audioStats.media.at(-1).currentSrc !== ${JSON.stringify(before.src)}`)
    await wait(1000)
    state = await evaluate(audioState)
    assert.ok(!seen.has(fileOf(state)), 'shuffle exhausts the actual playlist before repeating')
    seen.add(fileOf(state))
    assert.equal(state.playing, 1)
  }
  assert.equal(seen.size, 4)
  await click('[aria-label="Shuffle"]')
  await click('[aria-label="Pause music"]')
  console.log('PASS all eight supplied MP3s, encoded filenames, per-song volume, day/night playlists, sequential/previous/shuffle/native-ended playback and window stability')
}
const ready = `!window.__reloadPending && document.readyState === 'complete' && window.__audioStats?.media.length === 1 && !!document.querySelector('[aria-label="Play music"]') && Array.from(document.querySelectorAll('.wallpaper img')).every(i=>i.complete && i.naturalWidth>0)`

async function startBrowser() {
  fs.mkdirSync(output, { recursive: true })
  browser = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--autoplay-policy=user-gesture-required', 'about:blank'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  let stderr = ''
  const browserEndpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Chrome did not start: ' + stderr)), 15000)
    browser.once('error', reject)
    browser.stderr.on('data', chunk => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) { clearTimeout(timer); resolve(match[1]) }
    })
  })
  const endpoint = new URL(browserEndpoint)
  const target = await (await fetch('http://' + endpoint.host + '/json/new?about:blank', { method: 'PUT' })).json()
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject) })
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const handler = pending.get(message.id)
      if (handler) {
        pending.delete(message.id)
        message.error ? handler.reject(Error(JSON.stringify(message.error))) : handler.resolve(message.result)
      }
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails)
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400 && /wallpapers|music\.mp3/.test(message.params.response.url)) failedAssets.push(message.params.response)
  })
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__audioStats = {media:[], tones:[], contexts:[], loads:0};
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(...args) { super(...args); window.__audioStats.media.push(this); }
      load() { window.__audioStats.loads++; return super.load(); }
    };
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super(...args); window.__audioStats.contexts.push(this); }
      createOscillator() {
        const oscillator = super.createOscillator();
        const setFrequency = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
        let initialFrequency;
        oscillator.frequency.setValueAtTime = (value,time) => { initialFrequency=value;return setFrequency(value,time); };
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => { window.__audioStats.tones.push({frequency:initialFrequency??oscillator.frequency.value,type:oscillator.type}); return start(...args); };
        return oscillator;
      }
    };
  ` })
}

async function main() {
  await startBrowser()
  await dimensions(1920, 1080)
  await send('Page.navigate', { url })
  await until(ready)
  await verifyContinuousWallpaper()
  console.log('PASS continuous wallpaper under the actual system motion preference, beyond multiple loops')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await send('Page.navigate', { url })
  await until(ready)
  assert.equal((await evaluate(audioState)).playing, 0, 'no autoplay on mount')
  console.log('PASS initial load, wallpapers decoded, music awaits gesture')

  await until('document.querySelector(".store-environment")?.dataset.active === "true"')
  const initialRotor = await evaluate('getComputedStyle(document.querySelector(".fan-rotor")).transform')
  await wait(200)
  assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".fan-rotor")).transform'), initialRotor)
  assert.equal((await evaluate(audioState)).tones, 0, 'environment starts before the first interaction')
  console.log('PASS wallpaper motion starts automatically without a gesture')
  await verifyContinuousWallpaper()
  console.log('PASS continuous fan and fish loops at normal motion speeds')

  const swimmers = await evaluate(`Array.from(document.querySelectorAll('[data-fish]'),e=>({id:e.dataset.fish,duration:parseFloat(getComputedStyle(e).animationDuration),tail:getComputedStyle(e.querySelector('.fish-tail')).animationName}))`)
  for (const swimmer of swimmers) {
    const original = scene.fish.find(fish => fish.id === swimmer.id)
    assert.ok(Math.abs((original.duration / 1.4) / swimmer.duration - 1.6) < 0.0001, 'fish swim 60% faster than the previous animation')
    assert.equal(swimmer.tail, 'store-fish-fin')
  }
  const geometry = await evaluate(`(() => {
    const tank=${JSON.stringify(scene.tank)}, root=document.querySelector('.store-environment'), m=root.getScreenCTM();
    const bounds={left:m.e+tank.x*m.a,top:m.f+tank.y*m.d,right:m.e+(tank.x+tank.width)*m.a,bottom:m.f+(tank.y+tank.height)*m.d};
    const fish=Array.from(document.querySelectorAll('[data-fish]'));
    const animations=fish.flatMap(e=>e.getAnimations({subtree:true}));
    const saved=animations.map(a=>({a,time:a.currentTime,state:a.playState}));
    animations.forEach(a=>a.pause());
    let inside=true,flips=true,seamless=true,fins=true;
    for(const e of fish){
      const travel=e.getAnimations()[0],turn=e.querySelector('.fish-facing').getAnimations()[0],duration=travel.effect.getTiming().duration;
      let first;
      for(let step=0;step<=40;step++){
        travel.currentTime=turn.currentTime=duration*step/40;
        const r=e.getBoundingClientRect();
        if(r.left<bounds.left-0.5||r.right>bounds.right+0.5||r.top<bounds.top-0.5||r.bottom>bounds.bottom+0.5) inside=false;
        const transform=new DOMMatrix(getComputedStyle(e).transform);
        if(step===0)first=transform;
        if(step===40&&(Math.abs(transform.e-first.e)>0.01||Math.abs(transform.f-first.f)>0.01))seamless=false;
      }
      turn.currentTime=duration*0.25;
      const out=new DOMMatrix(getComputedStyle(e.querySelector('.fish-facing')).transform).a;
      turn.currentTime=duration*0.75;
      const back=new DOMMatrix(getComputedStyle(e.querySelector('.fish-facing')).transform).a;
      if(out*back!==-1)flips=false;
      const tail=e.querySelector('.fish-tail'),fin=tail.getAnimations()[0],timing=fin.effect.getTiming();
      fin.currentTime=-timing.delay;
      const before=getComputedStyle(tail).transform;
      fin.currentTime=-timing.delay+timing.duration/2;
      const after=getComputedStyle(tail).transform;
      if(before===after||after.startsWith('matrix3d'))fins=false;
    }
    for(const {a,time,state} of saved){a.currentTime=time;if(state==='running')a.play()}
    return {inside,flips,seamless,fins};
  })()`)
  assert.deepEqual(geometry, { inside:true, flips:true, seamless:true, fins:true })
  console.log('PASS 60% faster fish, unchanged fins/body, flat direction flips and tank bounds across complete loops')

  await verifyInteractiveDesktop()
  await verifyWallpaperObjects()
  await verifyFanControls()
  assert.equal(await evaluate('window.__audioStats.contexts.at(-1).state'), 'running')
  console.log('PASS PC gesture unlocks shared sound effects')

  await until('document.querySelector(".store-environment")?.dataset.active === "true"')
  assert.equal(await evaluate('document.querySelectorAll("[data-fish]").length'), 6)
  const rotorBefore = await evaluate('getComputedStyle(document.querySelector(".fan-rotor")).transform')
  const fishBefore = await evaluate('getComputedStyle(document.querySelector(".swimming-fish")).transform')
  await wait(350)
  assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".fan-rotor")).transform'), rotorBefore)
  assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".swimming-fish")).transform'), fishBefore)
  const clock = await evaluate(`(() => {const d=new Date();return {hour:Number(document.querySelector('[data-clock-hand=hour]').getAttribute('transform').match(/rotate\\(([^ ]+)/)[1]),minute:Number(document.querySelector('[data-clock-hand=minute]').getAttribute('transform').match(/rotate\\(([^ ]+)/)[1]),expectedHour:(d.getHours()%12+d.getMinutes()/60+d.getSeconds()/3600)*30,expectedMinute:(d.getMinutes()+d.getSeconds()/60)*6}})()`)
  assert.ok(Math.abs(clock.hour-clock.expectedHour)<0.03)
  assert.ok(Math.abs(clock.minute-clock.expectedMinute)<0.22)
  await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))`)
  await wait(80)
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".fan-rotor")).animationPlayState'), 'paused')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.environmental-motion')).every(e=>getComputedStyle(e).animationPlayState==='paused')`), true)
  const hiddenClock = await evaluate('document.querySelector("[data-clock-hand=minute]").getAttribute("transform")')
  await wait(1100)
  assert.equal(await evaluate('document.querySelector("[data-clock-hand=minute]").getAttribute("transform")'), hiddenClock)
  await evaluate(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`)
  assert.notEqual(await evaluate('document.querySelector("[data-clock-hand=minute]").getAttribute("transform")'), hiddenClock)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await until(`Math.abs(document.querySelector('.fan-rotor').getAnimations()[0].playbackRate-1/3)<0.000001`)
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('.swimming-fish'),e=>parseFloat(getComputedStyle(e).animationDuration)).every((duration,i)=>Math.abs(duration-${JSON.stringify(scene.fish.map(fish=>fish.duration/(1.4*1.6)*2))}[i])<0.001)`))
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".fish-tail")).animationName'), 'none')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".zapper-glow")).opacity'), '0')
  await verifyContinuousWallpaper()
  await evaluate("localStorage.setItem('portfolio-wallpaper-motion','off')")
  await reload()
  await until(ready)
  await verifyContinuousWallpaper()
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Wallpaper motion"]').length`), 0)
  console.log('PASS gentle continuous reduced motion, no flashing, reload continuity and no obsolete wallpaper controls')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".fan-rotor")).animationName'), 'store-fan-spin', 'obsolete saved Off choice cannot disable permanent animation')
  await evaluate(`window.__fanMotion=document.querySelector('.fan-rotor').getAnimations()[0]`)
  await evaluate(`window.__environmentMotions=Array.from(document.querySelectorAll('.environmental-motion'),e=>({e,a:e.getAnimations()[0]}));true`)
  console.log('PASS six swimmers, spinning rotor, local clock, hidden-tab pause and reduced motion')

  await click('[aria-label="Play music"]')
  await until('window.__audioStats.media.at(-1).currentTime > 0.1')
  assert.equal(await evaluate(`document.querySelector('[aria-label="Pause music"] .pixel-pause').getAttribute('shape-rendering')`), 'crispEdges')
  assert.equal((await evaluate(audioState)).playing, 1)
  const sourceBefore = await evaluate(audioState)
  await click('[aria-label="Toggle theme"]')
  await wait(1800)
  let state = await evaluate(audioState)
  assert.equal(state.playing, 1)
  assert.equal(state.count, 1)
  assert.equal(state.loads, sourceBefore.loads + 1)
  assert.notEqual(state.src, sourceBefore.src, 'day/night defaults use different supplied songs')
  assert.equal(await evaluate(`window.__fanMotion === document.querySelector('.fan-rotor').getAnimations()[0]`), true)
  assert.equal(await evaluate(`window.__environmentMotions.every(({e,a})=>e.getAnimations()[0]===a)`), true)
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".zapper-glow")).animationName'), 'store-zapper-glow')
  const pulses = await evaluate(`(() => {const e=document.querySelector('.zapper-glow'),a=e.getAnimations()[0],frames=a.effect.getKeyframes(),peaks=frames.filter(f=>Number(f.opacity)>=0.16);return {duration:a.effect.getTiming().duration,offsets:peaks.map(f=>f.computedOffset),max:Math.max(...frames.map(f=>Number(f.opacity))),filter:getComputedStyle(e).filter,visible:getComputedStyle(e).visibility}})()`)
  assert.ok(pulses.offsets.length / (pulses.duration / 1000) > 1.5 * (4 / 23))
  assert.ok(pulses.max <= 0.21)
  assert.equal(pulses.filter, 'none')
  assert.equal(pulses.visible, 'visible')
  assert.ok(new Set(pulses.offsets.slice(1).map((value,index)=>Math.round((value-pulses.offsets[index])*10000))).size > 5)
  console.log('PASS irregular flat zapper pulses, restrained brightness and all motion timelines preserved across themes')
  assert.ok(Math.abs(state.volume - expectedMusicVolume(state, 0.5)) < 0.001)
  assert.match(await evaluate('document.querySelector("[data-music-controls]").textContent'), /nighttime radio/)
  await screenshot('desktop-night-1080p')
  await evaluate(`document.querySelector('.wallpaper').style.zIndex='9999'`)
  await screenshot('environment-night')
  await evaluate(`document.querySelector('.wallpaper').style.zIndex=''`)
  console.log('PASS real music playback, 1.6s theme fade, one media stream')

  await click('[aria-label="Pause music"]')
  await click('[aria-label="Toggle theme"]')
  await wait(1800)
  assert.equal((await evaluate(audioState)).playing, 0)
  await screenshot('desktop-day-1080p')
  await evaluate(`document.querySelector('.wallpaper').style.zIndex='9999'`)
  await screenshot('environment-day')
  await evaluate(`document.querySelector('.wallpaper').style.zIndex=''`)
  console.log('PASS theme change while paused stays paused')

  // Pointer feedback fires once on entry, not on movement between button children.
  await ensureHome()
  await mouse(1900, 1050)
  await wait(150)
  const before = (await evaluate(audioState)).tones
  const rect = await evaluate(`(() => {const r=document.querySelector('button.group').getBoundingClientRect();return {x:r.x+10,y:r.y+10}})()`)
  await mouse(rect.x, rect.y)
  await wait(120)
  const afterHover = (await evaluate(audioState)).tones
  assert.equal(afterHover, before + 1)
  await mouse(rect.x + 2, rect.y + 2)
  await wait(120)
  assert.equal((await evaluate(audioState)).tones, afterHover)
  await click('[aria-label="UI sounds"]')
  const disabledTones = (await evaluate(audioState)).tones
  await mouse(1900, 1050)
  await mouse(rect.x, rect.y)
  await wait(150)
  assert.equal((await evaluate(audioState)).tones, disabledTones)
  await click('[aria-label="UI sounds"]')
  console.log('PASS hover debounce and independent UI sound toggle')

  await click('button.group')
  await until("!!document.querySelector('[data-window-id=about]')")
  const start = await evaluate(`(() => {const e=document.querySelector('[data-window-id=about]');const r=e.getBoundingClientRect();return {left:r.left,top:r.top,x:r.left+100,y:r.top+10}})()`)
  await mouse(start.x, start.y, 'mousePressed')
  await mouse(start.x + 100, start.y + 70)
  await mouse(start.x + 100, start.y + 70, 'mouseReleased')
  await wait(100)
  const end = await evaluate(`(() => {const r=document.querySelector('[data-window-id=about]').getBoundingClientRect();return {left:r.left,top:r.top}})()`)
  assert.ok(end.left > start.left + 80 && end.top > start.top + 50)
  await click('[data-window-id=about] [aria-label="Close window"]')
  assert.equal(await evaluate('document.querySelectorAll(".retro-app-window").length'), 1)
  console.log('PASS desktop navigation, window dragging and closing')
  await verifyDesktopUi()
  await verifyAboutInteractions()
  await verifySuppliedMusic()

  await click('[aria-label="Play music"]')
  await click('[aria-label="Next track"]')
  await wait(1800)
  assert.equal((await evaluate(audioState)).playing, 1)
  await click('[aria-label="Previous track"]')
  await wait(1800)
  assert.equal((await evaluate(audioState)).playing, 1)
  await click('[aria-label="Mute music"]')
  await click('[aria-label="Toggle theme"]')
  await wait(1800)
  state = await evaluate(audioState)
  assert.equal(state.muted, true)
  assert.equal(state.playing, 0)
  await click('[aria-label="Unmute music"]')
  await until('!window.__audioStats.media.at(-1).paused')
  await click('[aria-label="Shuffle"]')
  await evaluate(`(() => {const e=document.querySelector('[aria-label="Music volume"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'35');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`)
  await wait(150)
  const prefs = await evaluate(`JSON.parse(localStorage.getItem('portfolio-audio-v1'))`)
  assert.equal(prefs.volume, 0.35)
  assert.equal(prefs.shuffle, true)
  await click('[aria-label="Pause music"]')
  console.log('PASS next, previous, mute, unmute, shuffle and volume')

  await reload()
  await until(ready)
  state = await evaluate(audioState)
  assert.equal(state.playing, 0)
  assert.ok(Math.abs(state.volume - expectedMusicVolume(state, 0.35)) < 0.001)
  assert.equal(await evaluate('document.querySelector("[aria-label=Shuffle]").getAttribute("aria-pressed")'), 'true')
  await evaluate(`(() => {const p=JSON.parse(localStorage.getItem('portfolio-audio-v1'));p.enabled=true;localStorage.setItem('portfolio-audio-v1',JSON.stringify(p));})()`)
  await reload()
  await until(ready)
  assert.equal((await evaluate(audioState)).playing, 0)
  await click('[aria-label="Play music"]')
  await until('!window.__audioStats.media.at(-1).paused')
  assert.equal((await evaluate(audioState)).playing, 1, 'resume gesture must not immediately pause')
  await click('[aria-label="Pause music"]')
  console.log('PASS saved preferences, restored playback intent and autoplay policy')

  for (const [width, height, label] of [[2560,1440,'1440p'],[3840,2160,'4k'],[375,812,'mobile']]) {
    await dimensions(width,height)
    await wait(700)
    const layout = await evaluate(`(() => {const i=document.querySelector('.wallpaper img');const r=i.getBoundingClientRect();return {width:r.width,height:r.height,fit:getComputedStyle(i).objectFit,overflow:document.documentElement.scrollWidth>innerWidth}})()`)
    assert.ok(Math.abs(layout.width - (width <= 1024 ? Math.max(width,height*scene.width/scene.height) : width)) < 1)
    assert.equal(layout.height, height)
    assert.equal(layout.fit, 'contain')
    assert.equal(layout.overflow, false)
    const alignment = await evaluate(`(() => {const s=document.querySelector('.store-environment'),m=s.getScreenCTM(),stage=document.querySelector('.store-scene').getBoundingClientRect(),scale=Math.min(stage.width/1672,stage.height/941);return {scale:m.a,expected:scale,x:m.e,y:m.f,ex:stage.left+(stage.width-1672*scale)/2,ey:stage.top+(stage.height-941*scale)/2}})()`)
    assert.ok(Math.abs(alignment.scale-alignment.expected)<0.001)
    assert.ok(Math.abs(alignment.x-alignment.ex)<0.1 && Math.abs(alignment.y-alignment.ey)<0.1)
    await screenshot('desktop-' + label)
  }
  assert.deepEqual(failedAssets, [])
  assert.deepEqual(exceptions, [])
  console.log('PASS 1080p, 1440p, 4K and mobile layouts; no runtime exceptions or missing audio/wallpapers')
  fs.writeFileSync(path.join(output,'browser-results.json'), JSON.stringify({ passed:true, exceptions, failedAssets, preferences:prefs },null,2))
}

function runChecks(checks) { return checks().catch(async error => {
  console.error(error)
  process.exitCode = 1
  try { if (socket?.readyState === WebSocket.OPEN) await screenshot('failure') } catch { /* The browser may already be disconnected. */ }
}).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await send('Browser.close') } catch { /* Process cleanup below also handles a closed connection. */ }
    socket.close()
  }
  browser?.kill()
  // The isolated Chrome profile stays in OS temp; never touch a user's browser profile.
}) }

if (require.main === module) runChecks(main)
module.exports = { startBrowser, runChecks, send, evaluate, until, click, revealHotspot, mouse, screenshot, dimensions, reload, ready, audioState, url, output, exceptions, failedAssets }
