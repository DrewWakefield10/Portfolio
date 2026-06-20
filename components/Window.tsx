'use client'

import { useWindowManager } from '@/context/WindowContext'
import { useRef, useEffect, useState, useCallback } from 'react'

interface WindowProps {
  id: string
  title: string
  children: React.ReactNode
}

function CloseButton({ windowId }: { windowId: string }) {
  const { closeWindow } = useWindowManager()

  return (
    <button
      onClick={() => closeWindow(windowId)}
      className="retro-button ml-auto"
      aria-label="Close window"
    >
      ×
    </button>
  )
}

export function Window({ id, title, children }: WindowProps) {
  const { getWindow, updatePosition, bringToFront } = useWindowManager()

  const windowRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  const windowState = getWindow(id)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !windowRef.current) return

      const rect = windowRef.current.getBoundingClientRect()
      const nextX = e.clientX - dragOffsetRef.current.x
      const nextY = e.clientY - dragOffsetRef.current.y
      const maxX = Math.max(0, window.innerWidth - rect.width)
      const maxY = Math.max(0, window.innerHeight - rect.height)

      updatePosition(
        id,
        Math.max(0, Math.min(nextX, maxX)),
        Math.max(0, Math.min(nextY, maxY))
      )
    },
    [id, updatePosition]
  )

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [handleMouseMove, handleMouseUp])

  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()

      const rect = windowRef.current?.getBoundingClientRect()
      if (!rect) return

      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      isDraggingRef.current = true
      bringToFront(id)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [bringToFront, handleMouseMove, handleMouseUp, id]
  )

  if (!windowState || !windowState.isOpen) return null

  return (
    <div
      ref={windowRef}
      className="retro-window fixed"
      style={{
        left: `${windowState.position.x}px`,
        top: `${windowState.position.y}px`,
        zIndex: windowState.zIndex,
      }}
    >
      <div
        ref={headerRef}
        className="retro-window-header"
        onMouseDown={handleHeaderMouseDown}
      >
        <span>{title}</span>
        <CloseButton windowId={id} />
      </div>

      {/* Window Body */}
      <div className="h-[600px] w-[750px] flex flex-col overflow-hidden bg-window-bg text-foreground">
        {children}
      </div>
    </div>
  )
}