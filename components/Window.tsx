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

function mobileLayout() { return window.matchMedia('(max-width: 1024px)').matches }

function viewportBounds() {
  if (!mobileLayout()) return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
  const viewport = window.visualViewport
  const styles = getComputedStyle(document.documentElement)
  const safe = (edge: string) => parseFloat(styles.getPropertyValue(`--safe-area-${edge}`)) || 0
  const left = (viewport?.offsetLeft ?? 0) + safe('left') + 12
  const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - safe('right') - 12
  const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - safe('bottom') - 12
  const viewportTop = (viewport?.offsetTop ?? 0) + safe('top') + 8
  const navigationBottom = document.querySelector('.desktop-navigation')?.getBoundingClientRect().bottom ?? 0
  const top = Math.min(Math.max(viewportTop, navigationBottom + 8), Math.max(viewportTop, bottom - 96))
  return { left, top, right, bottom }
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
  const placed = useRef(false)

  const windowState = getWindow(id)

  const handleClose = useCallback(() => {
    closeWindow(id)
    if (returnFocusId) document.getElementById(returnFocusId)?.focus({ preventScroll: true })
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
      const bounds = viewportBounds()
      const maxX = Math.max(bounds.left, bounds.right - rect.width)
      const maxY = Math.max(bounds.top, bounds.bottom - rect.height)

      updatePosition(
        id,
        Math.max(bounds.left, Math.min(nextX, maxX)),
        Math.max(bounds.top, Math.min(nextY, maxY))
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
    if (!windowState?.isOpen) { placed.current = false; return }
    let firstPlacement = !placed.current
    placed.current = true
    const clampPosition = () => {
      const element = windowRef.current
      if (!element) return
      const bounds = viewportBounds()
      if (mobileLayout()) {
        element.style.setProperty('--mobile-window-width', `${bounds.right - bounds.left}px`)
        element.style.setProperty('--mobile-window-max-height', `${bounds.bottom - bounds.top}px`)
      }
      const rect = element.getBoundingClientRect()
      const center = firstPlacement && mobileLayout()
      const x = center ? (bounds.left + bounds.right - rect.width) / 2 : Math.max(bounds.left, Math.min(rect.left, bounds.right - rect.width))
      const y = center ? (bounds.top + bounds.bottom - rect.height) / 2 : Math.max(bounds.top, Math.min(rect.top, bounds.bottom - rect.height))
      firstPlacement = false
      if (Math.abs(x - rect.left) > 0.5 || Math.abs(y - rect.top) > 0.5) updatePosition(id, x, y)
    }
    clampPosition()
    const observer = new ResizeObserver(clampPosition)
    if (windowRef.current) observer?.observe(windowRef.current)
    const navigation = document.querySelector('.desktop-navigation')
    if (navigation) observer.observe(navigation)
    window.addEventListener('resize', clampPosition)
    window.visualViewport?.addEventListener('resize', clampPosition)
    window.visualViewport?.addEventListener('scroll', clampPosition)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', clampPosition)
      window.visualViewport?.removeEventListener('resize', clampPosition)
      window.visualViewport?.removeEventListener('scroll', clampPosition)
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
      onPointerDown={presentation === 'cloud' ? event => { if (!mobileLayout()) handleDragPointerDown(event) } : undefined}
      onFocusCapture={() => bringToFront(id)}
      onKeyDown={(event) => {
        if ((size !== 'default' || mobileLayout()) && event.key === 'Escape') {
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
        onPointerDown={event => { if (presentation === 'window' || mobileLayout()) handleDragPointerDown(event) }}
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
