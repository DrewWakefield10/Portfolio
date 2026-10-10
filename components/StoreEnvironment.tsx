'use client'

import { useEffect, useId, useRef, type CSSProperties } from 'react'
import scene from '@/lib/store-scene.json'

type Theme = 'light' | 'dark'
interface StoreEnvironmentProps {
  theme: Theme
  active: boolean
  onReady: () => void
  onError: () => void
}

const themes = ['light', 'dark'] as const
const directory = '/wallpapers/animation/'
const fishSpeed = 1.4
const sprites = ['day', 'night'].flatMap(mode => [...scene.fish.map(fish => fish.id), 'fan-hub', 'tank-foreground']
  .map(suffix => `${directory}${mode}-${suffix}.png`))

export function StoreEnvironment({ theme, active, onReady, onError }: StoreEnvironmentProps) {
  const root = useRef<SVGSVGElement>(null)
  const hour = useRef<SVGGElement>(null)
  const minute = useRef<SVGGElement>(null)
  const clipId = useId().replace(/:/g, '')
  const { fan, clock, tank, zapper } = scene

  useEffect(() => {
    let cancelled = false
    const images: HTMLImageElement[] = []
    // SVG image load events can finish before React hydrates. Explicit cached
    // image checks avoid leaving the static fallback visible indefinitely.
    void Promise.all(sprites.map(src => new Promise<void>((resolve, reject) => {
      const image = new window.Image()
      images.push(image)
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Animation sprite unavailable'))
      image.src = src
      if (image.complete && image.naturalWidth > 0) resolve()
    }))).then(() => { if (!cancelled) onReady() }, () => { if (!cancelled) onError() })
    return () => {
      cancelled = true
      images.forEach(image => { image.onload = null; image.onerror = null })
    }
  }, [onReady, onError])

  useEffect(() => {
    let timer = 0
    const updateClock = () => {
      const time = new Date()
      const seconds = time.getSeconds() + time.getMilliseconds() / 1000
      const minutes = time.getMinutes() + seconds / 60
      const hours = time.getHours() % 12 + minutes / 60
      hour.current?.setAttribute('transform', `rotate(${hours * 30} ${clock.cx} ${clock.cy})`)
      minute.current?.setAttribute('transform', `rotate(${minutes * 6} ${clock.cx} ${clock.cy})`)
    }
    const visibility = () => {
      window.clearInterval(timer)
      root.current?.setAttribute('data-running', String(!document.hidden))
      if (!document.hidden) {
        updateClock()
        timer = window.setInterval(updateClock, 1000)
      }
    }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [clock.cx, clock.cy])

  const themeImages = (suffix: string, x: number, y: number, width: number, height: number) => themes.map(mode => {
    const src = `${directory}${mode === 'light' ? 'day' : 'night'}-${suffix}.png`
    return <image key={mode} href={src} x={x} y={y} width={width} height={height}
      className="environment-paint" opacity={mode === theme ? 1 : 0}
      onError={onError} />
  })

  return (
    <svg ref={root} className="store-environment absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${scene.width} ${scene.height}`} preserveAspectRatio="xMidYMid meet"
      data-theme={theme} data-active={active} aria-hidden style={{ opacity: active ? 1 : 0 }}>
      <defs>
        <clipPath id={clipId}><rect x={tank.x} y={tank.y} width={tank.width} height={tank.height} /></clipPath>
        {scene.fish.map(fish => {
          const tailLeft = fish.facing === 'right'
          return <g key={fish.id}>
            {/* A two-pixel overlap keeps the original neck pixels joined as the fin flexes. */}
            <clipPath id={`${clipId}-${fish.id}-body`}>
              <rect x={fish.x + (tailLeft ? fish.tailAt - 1 : 0)} y={fish.y - 2}
                width={tailLeft ? fish.width - fish.tailAt + 1 : fish.tailAt + 1} height={fish.height + 4} />
            </clipPath>
            <clipPath id={`${clipId}-${fish.id}-tail`}>
              <rect x={fish.x + (tailLeft ? -2 : fish.tailAt - 1)} y={fish.y - 2}
                width={tailLeft ? fish.tailAt + 3 : fish.width - fish.tailAt + 3} height={fish.height + 4} />
            </clipPath>
          </g>
        })}
      </defs>

      {/* Only the rotor turns; grille, original hub, rim, stand and shelf stay fixed. */}
      <g className="fan-rotor environmental-motion" style={{ transformOrigin: `${fan.cx}px ${fan.cy}px` }}>
        {[0, 90, 180, 270].map((angle, index) => (
          <path key={angle} transform={`translate(${fan.cx} ${fan.cy}) rotate(${angle})`}
            d="M-5-18 L-23-48 L-32-51 L-44-43 L-49-31 L-43-18 L-22-8 Z"
            fill={index % 2 === 0 ? 'var(--fan-dark)' : 'var(--fan-light)'} />
        ))}
      </g>
      <g stroke="var(--fan-grille)" strokeWidth="1.8" opacity="0.8">
        {Array.from({ length: 24 }, (_, index) => {
          const angle = index * Math.PI / 12
          return <line key={index}
            x1={fan.cx + Math.cos(angle) * 22} y1={fan.cy + Math.sin(angle) * 22}
            x2={fan.cx + Math.cos(angle) * 58} y2={fan.cy + Math.sin(angle) * 58} />
        })}
      </g>
      {themeImages('fan-hub', fan.cx - fan.hubRadius, fan.cy - fan.hubRadius, fan.hubRadius * 2, fan.hubRadius * 2)}

      <g clipPath={`url(#${clipId})`}>
        {scene.fish.map((fish, index) => (
          <g key={fish.id} data-fish={fish.id} className="swimming-fish environmental-motion"
            style={{ '--swim-x': `${fish.dx}px`, '--swim-y': `${fish.dy}px`,
              '--swim-duration': `${fish.duration / fishSpeed}s`, '--swim-delay': `${-index * 3.7}s`,
              '--fin-duration': `${fish.finDuration}s`, '--fin-delay': `${-index * 0.17}s`,
              '--body-duration': `${2.3 + index * 0.31}s`,
              '--fish-facing': (fish.dx > 0) === (fish.facing === 'right') ? 1 : -1 } as CSSProperties}>
            <g className="fish-facing environmental-motion"
              style={{ transformOrigin: `${fish.x + fish.width / 2}px ${fish.y + fish.height / 2}px` }}>
              <g className="fish-body environmental-motion">
                <g clipPath={`url(#${clipId}-${fish.id}-body)`}>
                  {themeImages(fish.id, fish.x, fish.y, fish.width, fish.height)}
                </g>
                <g className="fish-tail environmental-motion"
                  style={{ transformOrigin: `${fish.x + fish.tailAt}px ${fish.y + fish.height / 2}px` }}>
                  <g clipPath={`url(#${clipId}-${fish.id}-tail)`}>
                    {themeImages(fish.id, fish.x, fish.y, fish.width, fish.height)}
                  </g>
                </g>
              </g>
            </g>
          </g>
        ))}
        {/* Original plant/rock pixels occlude swimmers near the aquarium floor. */}
        {themeImages('tank-foreground', tank.x, tank.y, tank.width, tank.height)}
      </g>

      {/* Angles are updated imperatively once a second using the user's local Date. */}
      <g fill="var(--clock-hand)" shapeRendering="crispEdges">
        <g ref={hour} data-clock-hand="hour">
          <path d={`M${clock.cx - 3} ${clock.cy + 5} V${clock.cy - 27} H${clock.cx + 3} V${clock.cy + 5}Z`} />
        </g>
        <g ref={minute} data-clock-hand="minute">
          <path d={`M${clock.cx - 2} ${clock.cy + 5} V${clock.cy - 39} H${clock.cx + 2} V${clock.cy + 5}Z`} />
        </g>
        <rect x={clock.cx - 4} y={clock.cy - 4} width="8" height="8" />
      </g>
      <rect className="zapper-glow environmental-motion" x={zapper.x} y={zapper.y}
        width={zapper.width} height={zapper.height} rx="3" fill="#71eaff" stroke="#a5f3ff" strokeWidth="1" />
    </svg>
  )
}
