'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useTheme } from './ThemeContext'
import { MusicPlayer } from '@/lib/music-player'
import { UiSounds, hoverSoundKind } from '@/lib/ui-sounds'

const AudioContext = createContext<{ player: MusicPlayer } | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const initialTheme = useRef(theme)
  const [player] = useState(() => new MusicPlayer())
  const context = useMemo(() => ({ player }), [player])

  useEffect(() => {
    const media = new Audio()
    let storage: Storage | undefined
    try { storage = window.localStorage } catch { /* Storage can be blocked. */ }
    player.connect(media, initialTheme.current, storage)
    const sounds = new UiSounds()
    let touchInput = false
    const selector = 'button, a[href], [role="button"], summary, input[type="range"], input[type="checkbox"]'
    const control = (target: EventTarget | null, includeSkills = false) => {
      const element = target instanceof Element ? target.closest<HTMLElement>(includeSkills ? `${selector}, [data-hover-sound="skill"]` : selector) : null
      if (!element || element.matches(':disabled, [aria-disabled="true"]') || element.closest('[data-sound="off"]')) return null
      return element
    }
    const unlock = (event: Event) => {
      if (!event.isTrusted) return
      if (player.getSnapshot().effects) sounds.unlock()
      // A touch may become a swipe; wait for its trusted click before resuming music.
      if (event.type === 'pointerdown' && event instanceof PointerEvent) {
        touchInput = event.pointerType === 'touch'
        if (touchInput) return
      } else if (event.type === 'keydown') touchInput = false
      if (!(event.target instanceof Element && event.target.closest('[data-music-controls]'))) player.resumeAfterGesture()
    }
    const hover = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !player.getSnapshot().effects) return
      const element = control(event.target, true)
      if (!element || (event.relatedTarget instanceof Node && element.contains(event.relatedTarget))) return
      sounds.play(hoverSoundKind(element.dataset.hoverSound))
    }
    const focus = (event: FocusEvent) => {
      if (touchInput) return
      const element = control(event.target, true)
      if (element && player.getSnapshot().effects) sounds.play(hoverSoundKind(element.dataset.hoverSound))
    }
    const click = (event: MouseEvent) => {
      if (event.detail > 0 && event.target instanceof Element && event.target.closest('.store-scene-viewport[data-panning="true"]')) return
      unlock(event)
      const element = control(event.target, true)
      if (element && player.getSnapshot().effects) {
        sounds.playFromGesture(element.dataset.hoverSound === 'skill' ? 'skill' : element.dataset.clickSound === 'switch' ? 'switch' : element.dataset.clickSound === 'fan' ? 'fan' : 'click')
      }
    }
    let effectsEnabled = player.getSnapshot().effects
    const unsubscribe = player.subscribe(() => {
      const enabled = player.getSnapshot().effects
      if (!enabled) sounds.silence()
      else if (!effectsEnabled) sounds.unlock()
      effectsEnabled = enabled
    })
    document.addEventListener('pointerdown', unlock, true)
    document.addEventListener('keydown', unlock, true)
    document.addEventListener('pointerover', hover)
    document.addEventListener('focusin', focus)
    document.addEventListener('click', click, true)
    return () => {
      unsubscribe()
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('keydown', unlock, true)
      document.removeEventListener('pointerover', hover)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('click', click, true)
      sounds.dispose()
      player.disconnect()
    }
  }, [player])

  useEffect(() => { void player.setTheme(theme) }, [player, theme])

  return <AudioContext.Provider value={context}>{children}</AudioContext.Provider>
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) throw new Error('useAudio must be used within AudioProvider')
  const { player } = context
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot)
  return { player, ...state }
}
