// Default mode mocks only EmailJS's HTTP transport; the real browser SDK still executes.
// Add --live explicitly for one controlled provider send after the mocked checks.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { startBrowser, runChecks, send, evaluate, until, click, screenshot, dimensions,
  ready, url, output, exceptions, failedAssets } = require('./browser-smoke.cjs')
const live = process.argv.includes('--live')
const windowSelector = '[data-window-id="contact"]'
const form = `${windowSelector} form`
const button = `${form} button[type="submit"]`
const email = `${form} input[name="email"]`
const message = `${form} textarea`
const feedback = `${form} [role="status"]`
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const defaults = { email: 'visitor@example.com', message: 'Hello from the controlled browser test.', website: '' }

async function fill(values = {}) {
  await evaluate(`(() => {const f=document.querySelector(${JSON.stringify(form)}),values=${JSON.stringify({ ...defaults, ...values })};for(const [name,value] of Object.entries(values)){const e=f.elements.namedItem(name);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}})()`)
}
async function submit() {
  await evaluate(`document.querySelector(${JSON.stringify(button)}).scrollIntoView({block:'center'})`)
  await click(button)
}
async function requestCount() { return evaluate('window.__contactTransport.requests.length') }
async function status(text) {
  await until(`document.querySelector(${JSON.stringify(feedback)})?.textContent.includes(${JSON.stringify(text)})`)
}
async function enter(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await send('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, text:'\r' })
  await send('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13 })
}
async function openContact() {
  if (!await evaluate(`!!document.querySelector('[data-window-id="home"]')`)) await click('#store-pc')
  await click('[aria-label="Open Contact"]')
  await until(`!!document.querySelector(${JSON.stringify(form)})`)
}
async function clearSdkThrottle() {
  await evaluate(`localStorage.removeItem('portfolio-contact')`)
}

async function main() {
  await startBrowser()
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__contactTransport={mock:true,requests:[],finish:null};
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,options)=>{
      if(String(input)==='https://api.emailjs.com/api/v1.0/email/send'){
        window.__contactTransport.requests.push(JSON.parse(options.body));
        if(window.__contactTransport.mock)return new Promise(resolve=>{
          window.__contactTransport.finish=(status)=>resolve(new Response(status===200?'OK':'RAW PROVIDER FAILURE',{status}));
        });
      }
      return originalFetch(input,options);
    };
  ` })
  await dimensions(1440,900)
  await send('Page.navigate', { url })
  await until(ready)
  await click('[aria-label="Play music"]')
  await until('window.__audioStats.media.some(a=>!a.paused)')
  await openContact()
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(form)}).noValidate`), true)
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(`${form} input:not([name="website"]), ${form} textarea`)}).length`), 2)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(`${form} input[name="website"]`)}).parentElement).display`), 'none')

  await fill({ email:'', message:'' })
  await submit()
  assert.equal(await evaluate(`document.activeElement.name`), 'email')
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(`${form} [aria-invalid="true"]`)}).length`), 2)
  for (const values of [{ email:'bad-email' }, { message:'' }, { message:'too short' }, { message:'x'.repeat(5001) }, { email:'x'.repeat(255)+'@example.com' }]) {
    await fill(values)
    await submit()
  }
  await fill({ website:'spam' })
  await submit()
  await status('MESSAGE FAILED')
  assert.equal(await requestCount(), 0, 'invalid and honeypot submissions must never call EmailJS')
  console.log('PASS empty/invalid/length validation, field focus and honeypot; zero provider requests')

  await fill()
  await evaluate(`window.__contactContinuity={contact:document.querySelector(${JSON.stringify(windowSelector)}),home:document.querySelector('[data-window-id="home"]'),homeStyle:document.querySelector('[data-window-id="home"]').style.cssText,music:window.__audioStats.media.at(-1),musicTime:window.__audioStats.media.at(-1).currentTime,motion:Array.from(document.querySelectorAll('.fan-rotor,.swimming-fish')).flatMap(e=>e.getAnimations()).map(a=>({a,time:a.currentTime}))};true`)
  await submit()
  await until('window.__contactTransport.requests.length===1')
  await status('Sending your message')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(button)}).textContent.trim()`), 'Sending...')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(button)}).disabled`), true)
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(email)}).readOnly`), true)
  await evaluate(`for(let i=0;i<15;i++)document.querySelector(${JSON.stringify(form)}).requestSubmit()`)
  await wait(350)
  assert.equal(await requestCount(), 1, 'repeated submits share the pending lock')
  await screenshot('contact-sending-desktop')
  await evaluate('window.__contactTransport.finish(503)')
  await status('MESSAGE FAILED. PLEASE TRY AGAIN.')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(email)}).value`), defaults.email)
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(message)}).value`), defaults.message)
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(windowSelector)}).textContent.includes('RAW PROVIDER FAILURE')`), false)

  await submit()
  await status('MESSAGE FAILED. PLEASE TRY AGAIN.')
  assert.equal(await requestCount(), 1, 'SDK throttling also blocks immediate retries after provider failure')

  await clearSdkThrottle()
  await enter(email)
  await until('window.__contactTransport.requests.length===2')
  await evaluate('window.__contactTransport.finish(200)')
  await status('MESSAGE SENT SUCCESSFULLY!')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(email)}).value`), '')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(message)}).value`), '')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(button)}).disabled`), false)
  const payload = await evaluate('window.__contactTransport.requests.at(-1)')
  assert.deepEqual(payload.template_params, { from_name:'Portfolio Visitor', reply_to:defaults.email, message:defaults.message })
  assert.ok(payload.service_id && payload.template_id && payload.user_id && payload.lib_version, 'SDK uses configured public identifiers')
  assert.equal(await evaluate(`(() => {const c=window.__contactContinuity;return c.contact===document.querySelector(${JSON.stringify(windowSelector)})&&c.home===document.querySelector('[data-window-id="home"]')&&c.homeStyle===c.home.style.cssText&&c.motion.length===7&&c.motion.every(({a,time})=>a.playState==='running'&&a.currentTime>time)&&!c.music.paused&&c.music.currentTime>c.musicTime})()`), true, 'desktop nodes, other window position, music and all seven animations survive submission')
  await screenshot('contact-success-desktop')
  await fill()
  await submit()
  await status('PLEASE WAIT 30 SECONDS')
  assert.equal(await requestCount(), 2)
  await click(`${windowSelector} [aria-label="Close window"]`)
  await openContact()
  await fill()
  await submit()
  await status('PLEASE WAIT 30 SECONDS')
  assert.equal(await requestCount(), 2, 'cooldown survives Contact.app remount')
  console.log('PASS real SDK mapping, sending/duplicate states, failure/retry, success/clear, cooldown, keyboard Enter and desktop continuity')

  // Reload resets module state; clear only the test's timestamps to exercise fresh sends.
  await evaluate(`localStorage.removeItem('portfolio-contact-last-success');localStorage.removeItem('portfolio-contact')`)
  await dimensions(390,844)
  await send('Emulation.setTouchEmulationEnabled', { enabled:true })
  await send('Page.navigate', { url })
  await until(ready)
  await openContact()
  await fill({ email:'', message:'' })
  await submit()
  const outline = await evaluate(`getComputedStyle(document.activeElement).outlineStyle`)
  assert.equal(outline, 'solid', 'keyboard/programmatic invalid focus is visible')
  await fill()
  await evaluate(`document.querySelector(${JSON.stringify(button)}).scrollIntoView({block:'center'})`)
  const point = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(button)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{...point,id:1}]})
  await send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]})
  await until('window.__contactTransport.requests.length===1')
  await evaluate('window.__contactTransport.finish(200)')
  await status('MESSAGE SENT SUCCESSFULLY!')
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth&&document.querySelector(${JSON.stringify(form)}).scrollWidth<=document.querySelector(${JSON.stringify(form)}).clientWidth`), true)
  await screenshot('contact-success-mobile-light')
  await click('[aria-label="Toggle theme"]')
  await screenshot('contact-success-mobile-dark')
  console.log('PASS narrow-screen scrolling, touch send, no overflow, visible focus and both themes')

  let liveStatus = 'not attempted (mock transport only)'
  if (live) {
    await evaluate(`localStorage.removeItem('portfolio-contact-last-success');localStorage.removeItem('portfolio-contact')`)
    await send('Page.navigate', { url })
    await until(ready)
    await openContact()
    await evaluate('window.__contactTransport.mock=false')
    await fill({ email:'drew.wakefield.10@gmail.com', message:'CONTROLLED PORTFOLIO INTEGRATION TEST: This is the single authorized test of Contact.app and the EmailJS template. No reply is needed. API acceptance will be checked separately from Gmail inbox delivery.' })
    await submit()
    await until(`!document.querySelector(${JSON.stringify(button)}).disabled`, 25000)
    assert.equal(await requestCount(), 1, 'live mode must dispatch at most one real request')
    liveStatus = await evaluate(`document.querySelector(${JSON.stringify(feedback)}).textContent`)
    console.log('LIVE EmailJS result: ' + liveStatus + ' (Gmail inbox not inspected)')
  }
  assert.deepEqual(exceptions, [])
  assert.deepEqual(failedAssets, [])
  fs.writeFileSync(path.join(output,'contact-results.json'), JSON.stringify({passed:true,liveStatus,inboxDeliveryVerified:false},null,2))
}
runChecks(main)
