'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import { FanRotation, fanPlaybackRate, type FanSpeed } from '@/lib/fan'

export function useFanRotation(rotor: RefObject<SVGGElement | null>, speed: FanSpeed, ready: boolean) {
  const initialized = useRef(false)
  useLayoutEffect(() => {
    const animation = rotor.current?.getAnimations()[0]
    if (!animation) return
    const controller = new FanRotation(animation)
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      controller.setRate(ready ? fanPlaybackRate(speed, media.matches) : 0, initialized.current && ready)
      if (ready) initialized.current = true
    }
    const visibility = () => {
      if (document.hidden) controller.dispose()
      else update()
    }
    update()
    media.addEventListener('change', update)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      controller.dispose()
      media.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [rotor, speed, ready])
}
