// These calculations always use the visitor's local Date, including DST changes.
export function clockAngles(time: Date) {
  const seconds = time.getSeconds() + time.getMilliseconds() / 1000
  const minutes = time.getMinutes() + seconds / 60
  return { hour: (time.getHours() % 12 + minutes / 60) * 30, minute: minutes * 6 }
}

export function calendarMonth(time: Date) {
  const year = time.getFullYear(), month = time.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells = Math.ceil((firstWeekday + days) / 7) * 7
  return Array.from({ length: cells }, (_, index) => {
    const day = index - firstWeekday + 1
    return day > 0 && day <= days ? day : null
  })
}

export function localDateKey(time: Date) {
  return `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`
}

export function localTimezone(time: Date) {
  const offset = -time.getTimezoneOffset()
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0')
  return `${Intl.DateTimeFormat().resolvedOptions().timeZone} · UTC${offset >= 0 ? '+' : '-'}${hours}:${minutes}`
}

// One second-aligned timer shared by the SVG clock and any open information windows.
// Merely importing this module does not access the DOM or start a timer during SSR.
const listeners = new Set<() => void>()
let snapshot: number | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const publish = () => {
  snapshot = Date.now()
  listeners.forEach(listener => listener())
}
const tick = () => {
  publish()
  timer = setTimeout(tick, 1000 - Date.now() % 1000)
}
const visibility = () => {
  clearTimeout(timer)
  timer = undefined
  // Notify imperative SVG subscribers on both hide and show, even within one second.
  publish()
  if (!document.hidden) timer = setTimeout(tick, 1000 - Date.now() % 1000)
}

export const localClock = {
  getSnapshot: () => snapshot,
  getServerSnapshot: (): null => null,
  subscribe(listener: () => void) {
    const first = listeners.size === 0
    listeners.add(listener)
    if (first) {
      document.addEventListener('visibilitychange', visibility)
      visibility()
    }
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        clearTimeout(timer)
        timer = undefined
        document.removeEventListener('visibilitychange', visibility)
        snapshot = null
      }
    }
  },
}
