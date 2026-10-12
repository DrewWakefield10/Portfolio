'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import scene from '@/lib/store-scene.json'
import { Wallpaper } from './Wallpaper'
import { StoreHotspots } from './StoreHotspots'

/** One native scroll surface moves artwork, animations and hit targets together. */
export function StoreScene() {
  const viewport = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const gesture = useRef({ x: 0, y: 0, pointer: -1, moved: false })

  useEffect(() => {
    const container = viewport.current
    const content = stage.current
    if (!container || !content) return
    let center = (scene.interactions.pc.x + scene.interactions.pc.width / 2) / scene.width
    let viewportWidth = 0
    let sceneWidth = 0
    let hintSeen = false
    try { hintSeen = sessionStorage.getItem('store-pan-discovered') === 'true' } catch { /* Discovery still works without storage. */ }
    const dismissHint = () => {
      hintSeen = true
      container.dataset.panHint = 'false'
      try { sessionStorage.setItem('store-pan-discovered', 'true') } catch { /* Optional preference. */ }
    }
    const resize = () => {
      const width = container.clientWidth
      const renderedWidth = content.offsetWidth
      if (width === viewportWidth && renderedWidth === sceneWidth) return
      viewportWidth = width
      sceneWidth = renderedWidth
      const maximum = Math.max(0, renderedWidth - width)
      container.dataset.pannable = String(maximum > 1)
      container.dataset.panHint = String(maximum > 1 && !hintSeen)
      container.scrollLeft = Math.max(0, Math.min(center * renderedWidth - width / 2, maximum))
    }
    const scroll = () => {
      // ResizeObserver preserves the previous center before a browser resize clamps scrollLeft.
      if (container.clientWidth !== viewportWidth || content.offsetWidth !== sceneWidth) return
      if (sceneWidth > viewportWidth + 1) center = (container.scrollLeft + viewportWidth / 2) / sceneWidth
      if (gesture.current.moved) dismissHint()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    observer.observe(content)
    container.addEventListener('scroll', scroll, { passive: true })
    resize()
    const timer = window.setTimeout(dismissHint, 6500)
    return () => {
      observer.disconnect()
      container.removeEventListener('scroll', scroll)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div ref={viewport} className="store-scene-viewport absolute inset-0" role="region" aria-label="Interactive store" tabIndex={0}
      onPointerDownCapture={event => {
        if (!event.isPrimary) return
        gesture.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId, moved: false }
        event.currentTarget.dataset.panning = 'false'
      }}
      onPointerMoveCapture={event => {
        const start = gesture.current
        if (event.pointerId !== start.pointer) return
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
          start.moved = true
          event.currentTarget.dataset.panning = 'true'
          event.currentTarget.dataset.panHint = 'false'
        }
      }}
      onPointerUpCapture={() => { gesture.current.pointer = -1 }}
      onPointerCancelCapture={event => {
        gesture.current.pointer = -1
        gesture.current.moved = true
        event.currentTarget.dataset.panning = 'true'
      }}
      onClickCapture={event => {
        if (event.detail > 0 && gesture.current.moved) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}>
      <div ref={stage} className="store-scene" style={{ '--scene-ratio': scene.width / scene.height } as CSSProperties}>
        <Wallpaper />
        <div className="absolute inset-0 bg-background/20 pointer-events-none" />
        <StoreHotspots />
      </div>
      <svg className="scene-pan-hint" width="42" height="22" viewBox="0 0 42 22" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M9 3h3v3H9v3H6v4h3v3h3v3H9v-3H6v-3H3V9h3V6h3zM30 3h3v3h3v3h3v4h-3v3h-3v3h-3v-3h3v-3h3V9h-3V6h-3zM17 9h8v4h-8z" />
      </svg>
    </div>
  )
}
