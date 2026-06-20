'use client'

import { createContext, useContext, useState, useCallback } from 'react'

export interface WindowState {
  id: string
  isOpen: boolean
  position: { x: number; y: number }
  zIndex: number
}

interface WindowContextType {
  windows: Map<string, WindowState>
  openWindow: (id: string) => void
  closeWindow: (id: string) => void
  bringToFront: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  getWindow: (id: string) => WindowState | undefined
}

const WindowContext = createContext<WindowContextType | undefined>(undefined)

export function WindowProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<Map<string, WindowState>>(new Map())
  const [nextZIndex, setNextZIndex] = useState(100)

  const openWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const newMap = new Map(prev)
      if (!newMap.has(id)) {
        const newZIndex = Math.max(0, ...Array.from(newMap.values(), (w) => w.zIndex)) + 1
        newMap.set(id, {
          id,
          isOpen: true,
          position: { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 },
          zIndex: newZIndex,
        })
      } else {
        const existing = newMap.get(id)!
        newMap.set(id, {
          ...existing,
          isOpen: true,
        })
      }
      return newMap
    })
  }, [])

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const newMap = new Map(prev)
      const window = newMap.get(id)
      if (window) {
        newMap.set(id, {
          ...window,
          isOpen: false,
        })
      }
      return newMap
    })
  }, [])

  const bringToFront = useCallback((id: string) => {
    setWindows((prev) => {
      const newMap = new Map(prev)
      const window = newMap.get(id)
      if (!window) return prev

      const newZIndex = Math.max(0, ...Array.from(newMap.values(), (w) => w.zIndex)) + 1
      newMap.set(id, {
        ...window,
        zIndex: newZIndex,
      })
      return newMap
    })
  }, [])

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => {
      const newMap = new Map(prev)
      const window = newMap.get(id)
      if (window) {
        newMap.set(id, {
          ...window,
          position: { x, y },
        })
      }
      return newMap
    })
  }, [])

  const getWindow = useCallback((id: string) => {
    return windows.get(id)
  }, [windows])

  return (
    <WindowContext.Provider
      value={{
        windows,
        openWindow,
        closeWindow,
        bringToFront,
        updatePosition,
        getWindow,
      }}
    >
      {children}
    </WindowContext.Provider>
  )
}

export function useWindowManager() {
  const context = useContext(WindowContext)
  if (context === undefined) {
    throw new Error('useWindowManager must be used within WindowProvider')
  }
  return context
}
