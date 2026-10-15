'use client'

import type { CSSProperties, MouseEvent } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useWindowManager } from '@/context/WindowContext'
import scene from '@/lib/store-scene.json'
import { useFan } from '@/context/FanContext'
import { nextFanSpeed } from '@/lib/fan'

type Rectangle = { x: number; y: number; width: number; height: number }
const position = (rect: Rectangle, parent: Rectangle): CSSProperties => ({
  left: `${(rect.x - parent.x) / parent.width * 100}%`,
  top: `${(rect.y - parent.y) / parent.height * 100}%`,
  width: `${rect.width / parent.width * 100}%`,
  height: `${rect.height / parent.height * 100}%`,
})
const canvas = { x: 0, y: 0, width: scene.width, height: scene.height }
const objects = [
  { id: 'phone', windowId: 'contact', label: 'Contact via wall telephone', sound: 'phone' },
  { id: 'clock', windowId: 'time', label: 'local time', sound: 'clock' },
  { id: 'calendar', windowId: 'calendar', label: 'local calendar', sound: 'paper' },
  { id: 'board', windowId: 'works', label: 'Work via bulletin board', sound: 'paper' },
  { id: 'machines', windowId: 'sources', label: 'sources and credits via store machines', sound: 'paper' },
] as const

function illuminate(event: MouseEvent<HTMLButtonElement>) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const paint = event.currentTarget.querySelector('.hotspot-illumination')
  paint?.getAnimations().forEach(animation => animation.cancel())
  paint?.animate([{ opacity: 0.08 }, { opacity: 0.28, offset: 0.25 }, { opacity: 0 }], {
    duration: 450, easing: 'steps(4, end)',
  })
}

function zap(event: MouseEvent<HTMLButtonElement>) {
  const flash = event.currentTarget.querySelector('.zapper-click-flash')
  flash?.getAnimations().forEach(animation => animation.cancel())
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  flash?.animate(reducedMotion
    ? [{ opacity: 0.18 }, { opacity: 0 }]
    : [{ opacity: 0 }, { opacity: 0.46, offset: 0.12 }, { opacity: 0.1, offset: 0.32 },
      { opacity: 0.28, offset: 0.5 }, { opacity: 0 }],
  { duration: reducedMotion ? 140 : 180, easing: reducedMotion ? 'ease-out' : 'steps(2, end)' })
}

export function StoreHotspots() {
  const { theme, toggleTheme } = useTheme()
  const { getWindow, toggleWindow, updatePosition } = useWindowManager()
  const homeOpen = getWindow('home')?.isOpen ?? false
  const { speed: fanSpeed, cycleSpeed } = useFan(scene.fan.id)
  return (
    <div className="store-hotspots absolute inset-0 z-10 pointer-events-none">
      <div className="store-hotspot-map" style={{ aspectRatio: `${scene.width} / ${scene.height}`,
        width: `min(100%, calc(100dvh * ${scene.width} / ${scene.height}))` }}>
        <button id="store-pc" type="button" className="store-hotspot hotspot-pc"
          style={position(scene.interactions.pc, canvas)} aria-label={homeOpen ? 'Close Home' : 'Open Home'}
          aria-expanded={homeOpen} aria-controls="desktop-window-home"
          onClick={event => { illuminate(event); toggleWindow('home') }}>
          <span className="hotspot-illumination" style={position(scene.interactions.screen, scene.interactions.pc)} aria-hidden="true" />
        </button>
        <button id="store-fan" type="button" className="store-hotspot hotspot-object hotspot-fan"
          data-fan-id={scene.fan.id} data-fan-speed={fanSpeed} data-click-sound="fan"
          style={position(scene.interactions.fan, canvas)}
          aria-label={`Fan speed: ${fanSpeed}. Change to ${nextFanSpeed(fanSpeed)}.`}
          onClick={event => { illuminate(event); cycleSpeed() }}>
          <span className="hotspot-illumination" aria-hidden="true" />
          <span className="hotspot-detail" style={position(scene.interactions.fanControl, scene.interactions.fan)} aria-hidden="true" />
        </button>
        <button id="store-zapper" type="button" className="store-hotspot hotspot-zapper"
          data-click-sound="zap" data-hover-sound="off"
          style={position(scene.interactions.zapper, canvas)} aria-label="Activate bug zapper"
          onClick={zap}>
          <span className="zapper-click-flash" style={position(scene.zapper, scene.interactions.zapper)} aria-hidden="true" />
        </button>
        {objects.map(object => {
          const open = getWindow(object.windowId)?.isOpen ?? false
          return (
            <button key={object.id} id={`store-${object.id}`} type="button"
              className={`store-hotspot hotspot-object hotspot-${object.id}`} data-wallpaper-object={object.id}
              data-hover-sound={object.sound} style={position(scene.interactions[object.id], canvas)}
              aria-label={`${open ? 'Close' : 'Open'} ${object.label}`} aria-expanded={open}
              aria-controls={`desktop-window-${object.windowId}`}
              onClick={event => {
                illuminate(event)
                const firstWindow = !getWindow(object.windowId)
                const rect = event.currentTarget.getBoundingClientRect()
                toggleWindow(object.windowId)
                if (firstWindow && !matchMedia('(max-width: 1024px)').matches) updatePosition(object.windowId, rect.right + 12, rect.top)
              }}>
              <span className="hotspot-illumination" aria-hidden="true" />
              {object.id === 'phone' && <span className="hotspot-detail" style={position(scene.interactions.phoneKeypad, scene.interactions.phone)} aria-hidden="true" />}
              {object.id === 'clock' && <span className="hotspot-detail" style={position(scene.interactions.clockFace, scene.interactions.clock)} aria-hidden="true" />}
              {object.id === 'board' && <span className="hotspot-detail" aria-hidden="true" />}
            </button>
          )
        })}
        {scene.interactions.lights.map(light => (
          <button key={light.id} type="button" className="store-hotspot hotspot-light" data-light={light.id}
            data-click-sound="switch" style={position(light, canvas)}
            aria-label={`Flip ${light.id} store light to ${theme === 'light' ? 'night' : 'day'}`}
            onClick={event => { illuminate(event); toggleTheme() }}>
            <span className="hotspot-illumination" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
