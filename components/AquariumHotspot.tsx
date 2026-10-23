'use client'

import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import scene from '@/lib/store-scene.json'

export function AquariumHotspot({ style }: { style: CSSProperties }) {
  const ripple = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const hide = () => { if (document.hidden) ripple.current?.getAnimations().forEach(animation => animation.cancel()) }
    document.addEventListener('visibilitychange', hide)
    const paint = ripple.current
    return () => {
      document.removeEventListener('visibilitychange', hide)
      paint?.getAnimations().forEach(animation => animation.cancel())
    }
  }, [])
  const tap = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const x = event.detail === 0 ? 0.5 : Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = event.detail === 0 ? 0.5 : Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    button.closest('.store-scene')?.dispatchEvent(new CustomEvent('aquarium-tap', {
      detail: { x: scene.interactions.tank.x + x * scene.interactions.tank.width,
        y: scene.interactions.tank.y + y * scene.interactions.tank.height },
    }))
    const paint = ripple.current
    if (!paint) return
    paint.style.left = `${x * 100}%`
    paint.style.top = `${y * 100}%`
    paint.getAnimations().forEach(animation => animation.cancel())
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    paint.animate(reduced ? [{ opacity: 0.25 }, { opacity: 0 }] : [
      { opacity: 0.45, transform: 'translate(-50%, -50%) scale(0.55)' },
      { opacity: 0.2, offset: 0.45 },
      { opacity: 0, transform: 'translate(-50%, -50%) scale(1.15)' },
    ], { duration: reduced ? 160 : 320, easing: 'steps(4, end)' })
  }
  return (
    <button id="store-tank" type="button" className="store-hotspot hotspot-tank" style={style}
      data-hover-sound="off" data-click-sound="bubble" aria-label="Tap the aquarium glass" onClick={tap}>
      <span className="tank-glass-highlight" aria-hidden="true" />
      <span ref={ripple} className="tank-tap-ripple" aria-hidden="true" />
    </button>
  )
}
