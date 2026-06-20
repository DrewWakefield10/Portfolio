'use client'

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { cn } from '@/lib/utils'

interface RetroScrollAreaProps {
  children: ReactNode
  className?: string
  contentClassName?: string
}

const MIN_THUMB_HEIGHT = 40

export function RetroScrollArea({
  children,
  className,
  contentClassName,
}: RetroScrollAreaProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startScrollTop: number } | null>(null)

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

    const height = Math.max(
      MIN_THUMB_HEIGHT,
      (clientHeight / scrollHeight) * clientHeight
    )
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

    return () => observer.disconnect()
  }, [updateThumb])

  const handleThumbMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = contentRef.current
    if (!el) return

    dragRef.current = {
      startY: e.clientY,
      startScrollTop: el.scrollTop,
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }

  const handleTrackClick = (e: ReactMouseEvent) => {
    const el = contentRef.current
    const track = trackRef.current
    if (!el || !track || e.target !== track) return

    const rect = track.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const { scrollHeight, clientHeight } = el
    const thumbHeight = Math.max(
      MIN_THUMB_HEIGHT,
      (clientHeight / scrollHeight) * clientHeight
    )
    const maxTop = clientHeight - thumbHeight
    const targetTop = Math.max(0, Math.min(clickY - thumbHeight / 2, maxTop))
    const scrollRatio = maxTop > 0 ? targetTop / maxTop : 0

    el.scrollTop = scrollRatio * (scrollHeight - clientHeight)
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current
      const el = contentRef.current
      if (!drag || !el) return

      const { scrollHeight, clientHeight } = el
      const thumbHeight = Math.max(
        MIN_THUMB_HEIGHT,
        (clientHeight / scrollHeight) * clientHeight
      )
      const maxTop = clientHeight - thumbHeight
      const maxScroll = scrollHeight - clientHeight
      const deltaY = e.clientY - drag.startY
      const scrollDelta = maxTop > 0 ? (deltaY / maxTop) * maxScroll : 0

      el.scrollTop = drag.startScrollTop + scrollDelta
    }

    const onMouseUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [])

  return (
    <div className={cn('flex min-h-0 flex-1', className)}>
      <div
        ref={contentRef}
        className={cn(
          'retro-scroll-content min-h-0 flex-1 overflow-y-auto p-6',
          contentClassName
        )}
        onScroll={updateThumb}
      >
        {children}
      </div>

      {scrollable && (
        <div
          ref={trackRef}
          className="retro-scroll-track relative w-3.5 shrink-0 cursor-pointer border-l border-window-border bg-window-bg"
          onMouseDown={handleTrackClick}
          aria-hidden
        >
          <div
            className="retro-scroll-thumb absolute left-0 w-full cursor-grab border-2 border-window-border bg-accent active:cursor-grabbing"
            style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
            onMouseDown={handleThumbMouseDown}
          />
        </div>
      )}
    </div>
  )
}
