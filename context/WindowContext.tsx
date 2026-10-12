'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { getProject, type ProjectId } from '@/lib/projects'

export interface WindowState {
  id: string
  isOpen: boolean
  position: { x: number; y: number }
  zIndex: number
}

interface WindowContextType {
  windows: Map<string, WindowState>
  openWindow: (id: string) => void
  toggleWindow: (id: string) => void
  closeWindow: (id: string) => void
  bringToFront: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  getWindow: (id: string) => WindowState | undefined
  selectedProjectId: ProjectId | null
  selectProject: (id: ProjectId | null) => void
  openProject: (id: ProjectId) => boolean
}

const WindowContext = createContext<WindowContextType | undefined>(undefined)

export function WindowProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<Map<string, WindowState>>(new Map())
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId | null>(null)

  const showWindow = useCallback((id: string, toggle = false) => {
    setWindows((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(id)
      if (toggle && existing?.isOpen) {
        newMap.set(id, { ...existing, isOpen: false })
        return newMap
      }
      const newZIndex = Math.max(100, ...Array.from(newMap.values(), (w) => w.zIndex)) + 1
      if (!newMap.has(id)) {
        newMap.set(id, {
          id,
          isOpen: true,
          position: id === 'home'
            ? { x: Math.max(12, (window.innerWidth - 480) / 2), y: Math.max(48, (window.innerHeight - 310) / 2) }
            : { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 },
          zIndex: newZIndex,
        })
      } else {
        newMap.set(id, {
          ...existing!,
          isOpen: true,
          zIndex: newZIndex,
        })
      }
      return newMap
    })
  }, [])

  const openWindow = useCallback((id: string) => showWindow(id), [showWindow])
  const toggleWindow = useCallback((id: string) => showWindow(id, true), [showWindow])

  const selectProject = useCallback((id: ProjectId | null) => {
    if (id === null || getProject(id)) setSelectedProjectId(id)
  }, [])

  const openProject = useCallback((id: ProjectId) => {
    if (!getProject(id)) return false
    setSelectedProjectId(id)
    openWindow('works')
    return true
  }, [openWindow])

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
      const highest = Math.max(0, ...Array.from(newMap.values(), (w) => w.zIndex))
      if (window.zIndex === highest) return prev
      const newZIndex = highest + 1
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
        if (window.position.x === x && window.position.y === y) return prev
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
        toggleWindow,
        closeWindow,
        bringToFront,
        updatePosition,
        getWindow,
        selectedProjectId,
        selectProject,
        openProject,
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
