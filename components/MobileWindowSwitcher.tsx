'use client'

import { useWindowManager } from '@/context/WindowContext'
import { interests, interestWindowId } from '@/lib/about'

const titles: Record<string, string> = {
  home: 'Home', about: 'About.txt', works: 'Works.app', contact: 'Contact.app', time: 'TIME.EXE', calendar: 'CALENDAR.DAT',
  sources: 'Sources.txt',
  ...Object.fromEntries(interests.map(interest => [interestWindowId(interest.id), interest.title])),
}

export function MobileWindowSwitcher() {
  const { windows, bringToFront } = useWindowManager()
  const open = Array.from(windows.values()).filter(window => window.isOpen)
  if (open.length < 2) return null
  const active = Math.max(...open.map(window => window.zIndex))
  return (
    <div className="mobile-window-switcher" role="group" aria-label="Open applications">
      {open.map(window => (
        <button key={window.id} className="retro-button" type="button" aria-pressed={window.zIndex === active}
          aria-controls={`desktop-window-${window.id}`} onClick={() => {
            bringToFront(window.id)
            document.getElementById(`desktop-window-${window.id}`)?.focus({ preventScroll: true })
          }}>
          {titles[window.id] ?? window.id}
        </button>
      ))}
    </div>
  )
}
