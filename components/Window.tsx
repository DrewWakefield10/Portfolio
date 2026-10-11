'use client'

import { useWindowManager } from '@/context/WindowContext'
import { useRef, useEffect, useLayoutEffect, useCallback } from 'react'

interface WindowProps {
  id: string
  title: string
  children: React.ReactNode
  size?: 'default' | 'compact' | 'launcher' | 'info'
  returnFocusId?: string
  presentation?: 'window' | 'cloud'
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="retro-button ml-auto"
      aria-label="Close window"
    >
      ×
    </button>
  )
}

export function Window({ id, title, children, size = 'default', returnFocusId, presentation = 'window' }: WindowProps) {
  const { getWindow, updatePosition, bringToFront, closeWindow } = useWindowManager()

  const windowRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const pointerRef = useRef<number | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  const windowState = getWindow(id)

  const handleClose = useCallback(() => {
    closeWindow(id)
    if (returnFocusId) document.getElementById(returnFocusId)?.focus()
  }, [closeWindow, id, returnFocusId])

  useEffect(() => {
    if (windowState?.isOpen && size !== 'default') {
      windowRef.current?.querySelector<HTMLButtonElement>('.retro-window-header button')?.focus()
    }
  }, [windowState?.isOpen, size])

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current || e.pointerId !== pointerRef.current || !windowRef.current) return

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

  const handlePointerUp = useCallback(function endDrag() {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    pointerRef.current = null
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', endDrag)
    document.removeEventListener('pointercancel', endDrag)
  }, [handlePointerMove])

  useEffect(() => {
    return () => {
      isDraggingRef.current = false
      pointerRef.current = null
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [handlePointerMove, handlePointerUp, windowState?.isOpen])

  useLayoutEffect(() => {
    if (!windowState?.isOpen) return
    const clampPosition = () => {
      const rect = windowRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = Math.max(0, Math.min(rect.left, window.innerWidth - rect.width))
      const y = Math.max(0, Math.min(rect.top, window.innerHeight - rect.height))
      if (Math.abs(x - rect.left) > 0.5 || Math.abs(y - rect.top) > 0.5) updatePosition(id, x, y)
    }
    clampPosition()
    const observer = size === 'info' ? new ResizeObserver(clampPosition) : null
    if (windowRef.current) observer?.observe(windowRef.current)
    window.addEventListener('resize', clampPosition)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', clampPosition)
    }
  }, [id, size, updatePosition, windowState?.isOpen])

  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !e.isPrimary) return
      if ((e.target as Element).closest('button, a, input, textarea, select, [role="button"]')) return
      e.preventDefault()

      const rect = windowRef.current?.getBoundingClientRect()
      if (!rect) return

      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      isDraggingRef.current = true
      pointerRef.current = e.pointerId
      e.currentTarget.setPointerCapture(e.pointerId)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
      document.addEventListener('pointercancel', handlePointerUp)
    },
    [handlePointerMove, handlePointerUp]
  )

  if (!windowState || !windowState.isOpen) return null

  return (
    <div
      ref={windowRef}
      id={`desktop-window-${id}`}
      tabIndex={-1}
      className={`retro-window retro-app-window fixed ${presentation === 'cloud' ? 'retro-cloud-window' : 'retro-surface'}${size === 'compact' ? ' retro-mini-window' : ''}${size === 'launcher' ? ' home-launcher' : ''}${size === 'info' ? ' retro-info-window' : ''}`}
      data-window-id={id}
      role={presentation === 'cloud' || size === 'info' ? 'dialog' : 'region'}
      aria-label={title}
      aria-describedby={presentation === 'cloud' ? `window-body-${id}` : undefined}
      onPointerDownCapture={() => bringToFront(id)}
      onPointerDown={presentation === 'cloud' ? handleDragPointerDown : undefined}
      onFocusCapture={() => bringToFront(id)}
      onKeyDown={(event) => {
        if (size !== 'default' && event.key === 'Escape') {
          event.stopPropagation()
          handleClose()
        }
      }}
      style={{
        left: `${windowState.position.x}px`,
        top: `${windowState.position.y}px`,
        zIndex: windowState.zIndex,
      }}
    >
      {presentation === 'cloud' && (
        <svg className="interest-cloud-shape" viewBox="0 0 320 320" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M112 4H176V12H200V28H224V20H256V28H272V44H280V64H296V80H304V104H296V120H312V144H316V184H308V208H292V224H300V240H292V264H276V280H252V288H224V280H208V300H184V312H144V304H120V292H96V300H68V292H44V276H28V252H20V224H28V208H12V184H4V152H12V128H28V112H20V88H28V64H44V48H68V40H88V20H112Z" />
        </svg>
      )}
      <div
        className="retro-window-header"
        onPointerDown={presentation === 'window' ? handleDragPointerDown : undefined}
      >
        <span className="min-w-0">{title}</span>
        <CloseButton onClose={handleClose} />
      </div>

      {/* Window Body */}
      <div id={`window-body-${id}`} className="retro-window-body window-content text-foreground">
        {children}
      </div>
    </div>
  )
}
