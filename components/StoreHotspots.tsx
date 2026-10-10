'use client'

import type { CSSProperties, MouseEvent } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useWindowManager } from '@/context/WindowContext'
import scene from '@/lib/store-scene.json'

type Rectangle = { x: number; y: number; width: number; height: number }
const position = (rect: Rectangle, parent: Rectangle): CSSProperties => ({
  left: `${(rect.x - parent.x) / parent.width * 100}%`,
  top: `${(rect.y - parent.y) / parent.height * 100}%`,
  width: `${rect.width / parent.width * 100}%`,
  height: `${rect.height / parent.height * 100}%`,
})
const canvas = { x: 0, y: 0, width: scene.width, height: scene.height }

function illuminate(event: MouseEvent<HTMLButtonElement>) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const paint = event.currentTarget.querySelector('.hotspot-illumination')
  paint?.getAnimations().forEach(animation => animation.cancel())
  paint?.animate([{ opacity: 0.08 }, { opacity: 0.28, offset: 0.25 }, { opacity: 0 }], {
    duration: 450, easing: 'steps(4, end)',
  })
}

export function StoreHotspots() {
  const { theme, toggleTheme } = useTheme()
  const { getWindow, toggleWindow } = useWindowManager()
  const homeOpen = getWindow('home')?.isOpen ?? false
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
