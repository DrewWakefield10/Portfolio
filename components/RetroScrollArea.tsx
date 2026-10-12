'use client'

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { cn } from '@/lib/utils'

interface RetroScrollAreaProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  label?: string
}

const MIN_THUMB_HEIGHT = 40

export function RetroScrollArea({
  children,
  className,
  contentClassName,
  label = 'Window content',
}: RetroScrollAreaProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startScrollTop: number; pointer: number } | null>(null)

  const [thumb, setThumb] = useState({ height: 0, top: 0 })
  const [scrollable, setScrollable] = useState(false)

  const updateThumb = useCallback(() => {
    const el = contentRef.current
    if (!el) return

    const { scrollHeight, clientHeight, scrollTop } = el
    const canScroll = scrollHeight > clientHeight + 1

    setScrollable(canScroll)
    if (!canScroll) {
      setThumb({ height: 0, top: 0 })
      return
    }

    const height = Math.min(clientHeight, Math.max(
      MIN_THUMB_HEIGHT,
      (clientHeight / scrollHeight) * clientHeight
    ))
    const maxTop = clientHeight - height
    const top =
      maxTop <= 0
        ? 0
        : (scrollTop / (scrollHeight - clientHeight)) * maxTop

    setThumb({ height, top })
  }, [])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    updateThumb()

    const observer = new ResizeObserver(updateThumb)
    observer.observe(el)
    if (innerRef.current) observer.observe(innerRef.current)

    return () => observer.disconnect()
  }, [updateThumb])

  const handleThumbPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || !e.isPrimary) return
    e.preventDefault()
    e.stopPropagation()
    const el = contentRef.current
    if (!el) return

    dragRef.current = {
      startY: e.clientY,
      startScrollTop: el.scrollTop,
      pointer: e.pointerId,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }

  const handleTrackClick = (e: ReactPointerEvent) => {
    const el = contentRef.current
    const track = trackRef.current
    if (!el || !track || e.target !== track) return

    const rect = track.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const { scrollHeight, clientHeight } = el
    const thumbHeight = Math.min(clientHeight, Math.max(
      MIN_THUMB_HEIGHT,
      (clientHeight / scrollHeight) * clientHeight
    ))
    const maxTop = clientHeight - thumbHeight
    const targetTop = Math.max(0, Math.min(clickY - thumbHeight / 2, maxTop))
    const scrollRatio = maxTop > 0 ? targetTop / maxTop : 0

    el.scrollTop = scrollRatio * (scrollHeight - clientHeight)
  }

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      const el = contentRef.current
      if (!drag || !el || drag.pointer !== e.pointerId) return

      const { scrollHeight, clientHeight } = el
      const thumbHeight = Math.min(clientHeight, Math.max(
        MIN_THUMB_HEIGHT,
        (clientHeight / scrollHeight) * clientHeight
      ))
      const maxTop = clientHeight - thumbHeight
      const maxScroll = scrollHeight - clientHeight
      const deltaY = e.clientY - drag.startY
      const scrollDelta = maxTop > 0 ? (deltaY / maxTop) * maxScroll : 0

      el.scrollTop = drag.startScrollTop + scrollDelta
    }

    const onPointerUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)

    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [])

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1', className)}>
      <div
        ref={contentRef}
        className={cn(
          'retro-scroll-content min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6'
        )}
        onScroll={updateThumb}
        tabIndex={0}
        role="region"
        aria-label={label}
      >
        <div ref={innerRef} className={contentClassName}>{children}</div>
      </div>

      {scrollable && (
        <div
          ref={trackRef}
          className="retro-scroll-track relative w-3.5 shrink-0 cursor-pointer border-l border-window-border bg-window-bg"
          onPointerDown={handleTrackClick}
          aria-hidden
        >
          <div
            className="retro-scroll-thumb absolute left-0 w-full cursor-grab border-2 border-window-border bg-accent active:cursor-grabbing"
            style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
            onPointerDown={handleThumbPointerDown}
          />
        </div>
      )}
    </div>
  )
}
