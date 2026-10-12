'use client'

import { useSyncExternalStore } from 'react'
import { localClock, localDateKey } from '@/lib/local-time'
import scene from '@/lib/store-scene.json'

// Subscribe to the same clock as CALENDAR.DAT, but only rerender when the local date changes.
function getDateSnapshot() {
  const timestamp = localClock.getSnapshot()
  return timestamp === null ? null : localDateKey(new Date(timestamp))
}

export function WallCalendar({ theme }: { theme: 'light' | 'dark' }) {
  const date = useSyncExternalStore(localClock.subscribe, getDateSnapshot, localClock.getServerSnapshot)
  const [, month, day] = date?.split('-') ?? []
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${scene.width} ${scene.height}`} preserveAspectRatio="xMidYMid meet"
      data-wall-calendar={date ?? undefined} aria-hidden>
      {(['light', 'dark'] as const).map(mode => (
        <g key={mode} className="environment-paint" opacity={mode === theme ? 1 : 0}
          fontFamily="MS Gothic, Yu Gothic, sans-serif" textAnchor="middle" fontWeight="bold"
          fill={mode === 'light' ? '#872c34' : '#6d292f'} lang="ja">
          <path d="M980 348 H1076 V444 H980Z" fill={mode === 'light' ? '#faf3df' : '#e5ba87'} />
          <text x="1028" y="399" fontSize="62" data-calendar-day>{day ? Number(day) : '–'}</text>
          <text x="1028" y="438" fontSize="31" data-calendar-month>{month ? `${Number(month)}月` : '–'}</text>
        </g>
      ))}
    </svg>
  )
}
