'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useCatSound } from '@/context/AudioContext'
import { catKeyframes, CAT_DURATION_MS, CAT_MEOW_AT_MS } from '@/lib/cat-animation'

type CatState = 'idle' | 'anticipation' | 'meowing' | 'returning'

export function CatHotspot({ style }: { style: CSSProperties }) {
  const button = useRef<HTMLButtonElement>(null)
  const sprite = useRef<HTMLSpanElement>(null)
  const busy = useRef(false)
  const generation = useRef(0)
  const motion = useRef<Animation | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [ready, setReady] = useState(false)
  const sound = useCatSound()

  useEffect(() => {
    let alive = true
    const images = ['day-meow.png', 'night-meow.png', 'mask.png', 'motion-mask.png'].map(file => {
      const image = new Image()
      image.src = `/wallpapers/animation/cat/${file}`
      return image
    })
    void Promise.all(images.map(image => image.decode())).then(() => {
      if (alive) setReady(true)
    }, () => { /* Keep the original wallpaper cat if a sheet fails to load. */ })
    const cancel = () => {
      generation.current++
      timers.current.forEach(clearTimeout)
      timers.current = []
      motion.current?.cancel()
      motion.current = null
      busy.current = false
      if (button.current) {
        button.current.dataset.state = 'idle'
        button.current.removeAttribute('aria-busy')
      }
      sound.stop()
    }
    const visibility = () => { if (document.hidden) cancel() }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      alive = false
      cancel()
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [sound])

  const meow = async () => {
    if (!ready || busy.current || document.hidden) return
    busy.current = true
    const current = ++generation.current
    button.current?.setAttribute('aria-busy', 'true')
    // Decode once in the gesture-unlocked shared context, before starting the clock.
    await Promise.race([sound.prepare(), new Promise<void>(resolve => {
      timers.current.push(setTimeout(resolve, 180))
    })])
    if (current !== generation.current || document.hidden || !sprite.current) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    const state = (value: CatState) => { if (button.current) button.current.dataset.state = value }
    state('anticipation')
    const animation = sprite.current.animate(catKeyframes(matchMedia('(prefers-reduced-motion: reduce)').matches), {
      duration: CAT_DURATION_MS, iterations: 1,
    })
    motion.current = animation
    sound.play(CAT_MEOW_AT_MS / 1000)
    timers.current = [
      setTimeout(() => state('meowing'), CAT_MEOW_AT_MS),
      setTimeout(() => state('returning'), 1060),
    ]
    animation.onfinish = () => {
      state('idle')
      button.current?.removeAttribute('aria-busy')
      timers.current.forEach(clearTimeout)
      timers.current = []
      motion.current = null
      busy.current = false
    }
  }

  return (
    <button ref={button} id="store-cat" type="button" className="store-hotspot hotspot-cat"
      style={style} disabled={!ready} data-state="idle" data-hover-sound="off" data-click-sound="off"
      aria-label="Pet the cat" onClick={() => { void meow() }}>
      <span className="cat-pose" aria-hidden="true">
        <span ref={sprite} className="cat-sprite" />
        <span className="cat-tint" />
      </span>
      <span className="cat-hover" aria-hidden="true" />
    </button>
  )
}
