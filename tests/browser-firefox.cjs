// Firefox's native WebDriver BiDi connection; no browser automation dependency.
// Protocol: https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const net = require('node:net')
const { spawn, spawnSync } = require('node:child_process')
const scene = require('../lib/store-scene.json')
const url = process.argv[2] || 'http://localhost:3100'
const output = path.resolve('.next/verification/firefox')
const profile = fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-firefox-'))
let browser, socket, context, sequence = 0
const pending = new Map()
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms))
async function send(method,params={}) {
  const id=++sequence
  const response=new Promise((resolve,reject)=>pending.set(id,{resolve,reject}))
  socket.send(JSON.stringify({id,method,params}))
  return response
}
async function evaluate(expression) {
  const result=await send('script.evaluate',{expression:`(async()=>JSON.stringify(await (${expression})))()`,target:{context},awaitPromise:true})
  if(result.type==='exception') throw Error(JSON.stringify(result.exceptionDetails))
  return result.result.value===undefined?undefined:JSON.parse(result.result.value)
}
async function until(expression) {
  const end=Date.now()+10000
  while(Date.now()<end) { if(await evaluate(expression))return; await wait(100) }
  throw Error('Timed out: '+expression)
}
async function click(selector) {
  await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(e.matches('.store-hotspot'))e.scrollIntoView({inline:'center',block:'nearest'})})()`)
  await wait(50)
  const point=await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`)
  await send('input.performActions',{context,actions:[{type:'pointer',id:'mouse',parameters:{pointerType:'mouse'},actions:[
    {type:'pointerMove',...point,duration:0,origin:'viewport'},{type:'pointerDown',button:0},{type:'pointerUp',button:0},
  ]}]})
  await wait(100)
}
async function main() {
  fs.mkdirSync(output,{recursive:true})
  const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})})
  fs.writeFileSync(path.join(profile,'user.js'),'user_pref("browser.shell.checkDefaultBrowser", false);\nuser_pref("browser.startup.homepage_override.mstone", "ignore");\n')
  browser=spawn(process.env.FIREFOX_PATH||'C:/Program Files/Mozilla Firefox/firefox.exe',[
    '--headless','--no-deelevate','--no-remote','--profile',profile,`--remote-debugging-port=${port}`,'about:blank',
  ],{windowsHide:true,stdio:['ignore','pipe','pipe']})
  let stderr=''
  const endpoint=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Firefox did not start: '+stderr)),30000)
    browser.once('error',reject)
    const onData=data=>{
      stderr+=data
      const match=stderr.match(/WebDriver BiDi listening on (ws:\/\/[^\s]+)/)
      if(match){clearTimeout(timer);resolve(match[1].replace(/\/$/,'')+'/session')}
    }
    browser.stderr.on('data',onData)
    browser.stdout.on('data',onData)
  })
  socket=new WebSocket(endpoint)
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve);socket.addEventListener('error',reject)})
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data),handler=pending.get(message.id)
    if(handler){pending.delete(message.id);message.type==='error'?handler.reject(Error(JSON.stringify(message))):handler.resolve(message.result)}
  })
  const session=await send('session.new',{capabilities:{alwaysMatch:{}}})
  context=(await send('browsingContext.create',{type:'tab'})).context
  await send('script.addPreloadScript',{contexts:[context],functionDeclaration:`() => {
    window.__music=[];const NativeAudio=window.Audio;
    window.Audio=class extends NativeAudio {constructor(...args){super(...args);window.__music.push(this)}};
    window.__runtimeErrors=[];window.addEventListener('error',event=>window.__runtimeErrors.push(event.message));
  }`})
  await send('browsingContext.navigate',{context,url,wait:'complete'})
  await until('!!document.querySelector("#store-pc")&&document.querySelector(".store-environment").dataset.active==="true"')
  const views=[]
  for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[768,1024],[1024,768],[1366,768],[1920,1080]]) {
    await send('browsingContext.setViewport',{context,viewport:{width,height}})
    await wait(150)
    for(const dark of [false,true]) {
      if(await evaluate('document.documentElement.classList.contains("dark")')!==dark) await click('[aria-label="Toggle theme"]')
      const geometry=await evaluate('(() => {const v=document.querySelector(".store-scene-viewport"),s=document.querySelector(".store-scene").getBoundingClientRect();return {width:s.width,height:s.height,overflow:document.documentElement.scrollWidth>innerWidth}})()')
      assert.ok(Math.abs(geometry.width-(width<=1024?Math.max(width,height*scene.width/scene.height):width))<1)
      assert.equal(geometry.height,height)
      assert.equal(geometry.overflow,false)
      for(const [object,id] of [['pc','home'],['phone','contact'],['clock','time'],['calendar','calendar'],['board','works']]) {
        await click('#store-'+object)
        await until(`!!document.querySelector('[data-window-id=${id}]')`)
        assert.equal(await evaluate(`(() => {const e=document.querySelector('[data-window-id=${id}]'),r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5&&e.scrollWidth<=e.clientWidth+1})()`),true,'Firefox fitted '+id)
        await click(`[data-window-id=${id}] [aria-label="Close window"]`)
      }
      if(width===320||width===1920) {
        const image=await send('browsingContext.captureScreenshot',{context,origin:'viewport'})
        fs.writeFileSync(path.join(output,`${width}-${dark?'night':'day'}.png`),Buffer.from(image.data,'base64'))
      }
    }
    views.push([width,height])
    console.log(`PASS Firefox ${width}x${height}: both themes, fitted apps, clock/calendar, scene geometry and native pointer clicks`)
  }
  await send('browsingContext.setViewport',{context,viewport:{width:390,height:844}})
  await evaluate('document.querySelector(".store-scene-viewport").scrollLeft=0')
  await send('input.performActions',{context,actions:[{type:'wheel',id:'wheel',actions:[{type:'scroll',x:200,y:700,deltaX:220,deltaY:0,duration:250,origin:'viewport'}]}]})
  await until('document.querySelector(".store-scene-viewport").scrollLeft>100')
  await wait(500) // Firefox's native smooth wheel scrolling must settle before comparing themes.
  const position=await evaluate('document.querySelector(".store-scene-viewport").scrollLeft')
  await click('[aria-label="Toggle theme"]')
  assert.ok(Math.abs(await evaluate('document.querySelector(".store-scene-viewport").scrollLeft')-position)<1)
  await click('[aria-label="Play music"]')
  await until('window.__music.at(-1).currentTime>0.1&&!window.__music.at(-1).paused')
  assert.equal(await evaluate('window.__music.length'),1)
  await click('[aria-label="Pause music"]')
  assert.deepEqual(await evaluate('window.__runtimeErrors'),[])
  fs.writeFileSync(path.join(output,'firefox-results.json'),JSON.stringify({passed:true,browser:session.capabilities,viewports:views,nativeHorizontalWheel:true,singleMusicStream:true},null,2))
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
  if(socket?.readyState===WebSocket.OPEN){try{await send('session.end')}catch{/* Process cleanup below. */}socket.close()}
  if(browser?.pid&&process.platform==='win32') spawnSync(path.join(process.env.SystemRoot||'C:/Windows','System32/taskkill.exe'),['/PID',String(browser.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'})
  else browser?.kill()
})
