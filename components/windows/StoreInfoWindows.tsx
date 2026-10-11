'use client'

import { useSyncExternalStore } from 'react'
import { calendarMonth, localClock, localDateKey, localTimezone } from '@/lib/local-time'
import { Window } from '@/components/Window'

function useLocalTime() {
  const timestamp = useSyncExternalStore(localClock.subscribe, localClock.getSnapshot, localClock.getServerSnapshot)
  return timestamp === null ? null : new Date(timestamp)
}

function TimeContent() {
  const time = useLocalTime()
  return (
    <div className="store-time-content">
      <time className="store-time-value" dateTime={time?.toISOString()} data-local-time>
        {time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--:-- --'}
      </time>
      <p className="store-info-caption">LOCAL SYSTEM</p>
      <p className="store-info-zone">{time ? localTimezone(time) : 'Local timezone'}</p>
    </div>
  )
}

const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
function CalendarContent() {
  const time = useLocalTime()
  if (!time) return <p>Loading local date…</p>
  const days = calendarMonth(time)
  return (
    <div className="store-calendar-content">
      <time dateTime={localDateKey(time)} data-local-date>
        <span className="store-calendar-weekday">{time.toLocaleDateString('en-US', { weekday: 'long' })}</span>
        <span className="store-calendar-date">{time.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </time>
      <table className="store-calendar-grid" aria-label={time.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}>
        <thead><tr>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: days.length / 7 }, (_, week) => (
          <tr key={week}>{days.slice(week * 7, week * 7 + 7).map((day, index) => (
            <td key={index} aria-current={day === time.getDate() ? 'date' : undefined}>
              {day === time.getDate() ? <span className="calendar-today">{day}</span> : day}
            </td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function StoreInfoWindows() {
  return (
    <>
      <Window id="time" title="TIME.EXE" size="info" returnFocusId="store-clock"><TimeContent /></Window>
      <Window id="calendar" title="CALENDAR.DAT" size="info" returnFocusId="store-calendar"><CalendarContent /></Window>
    </>
  )
}
