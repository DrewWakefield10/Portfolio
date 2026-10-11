'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FAN_STORAGE_KEY, nextFanSpeed, readFanPreferences, type FanSpeed } from '@/lib/fan'
import scene from '@/lib/store-scene.json'

const ids = [scene.fan.id]
const FanContext = createContext<{
  speeds: Record<string, FanSpeed>
  ready: boolean
  cycleFan: (id: string) => void
} | null>(null)

export function FanProvider({ children }: { children: ReactNode }) {
  const [speeds, setSpeeds] = useState(() => readFanPreferences(null, ids))
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // One-time hydration restores browser preferences before enabling the rotor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setSpeeds(readFanPreferences(localStorage.getItem(FAN_STORAGE_KEY), ids)) } catch { /* Storage may be blocked. */ }
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(FAN_STORAGE_KEY, JSON.stringify(speeds)) } catch { /* Keep session controls usable. */ }
    }
  }, [ready, speeds])
  const cycleFan = useCallback((id: string) => {
    if (!ids.includes(id)) return
    setSpeeds(previous => ({ ...previous, [id]: nextFanSpeed(previous[id] ?? 'low') }))
  }, [])
  const value = useMemo(() => ({ speeds, ready, cycleFan }), [speeds, ready, cycleFan])
  return <FanContext.Provider value={value}>{children}</FanContext.Provider>
}

export function useFan(id: string) {
  const context = useContext(FanContext)
  if (!context) throw new Error('useFan must be used within FanProvider')
  return { speed: context.speeds[id] ?? 'low', ready: context.ready, cycleSpeed: () => context.cycleFan(id) }
}
