export const FAN_SPEEDS = { off: 0, low: 60, medium: 120, high: 240 } as const
export type FanSpeed = keyof typeof FAN_SPEEDS
export const FAN_STORAGE_KEY = 'portfolio-fan-speeds-v1'
const cycle: readonly FanSpeed[] = ['off', 'low', 'medium', 'high']

export function nextFanSpeed(speed: FanSpeed): FanSpeed {
  return cycle[(cycle.indexOf(speed) + 1) % cycle.length]
}

export function readFanPreferences(raw: string | null, ids: readonly string[]): Record<string, FanSpeed> {
  let saved: Record<string, unknown> = {}
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (value && typeof value === 'object' && !Array.isArray(value)) saved = value as Record<string, unknown>
  } catch { /* Invalid preferences use Low. */ }
  return Object.fromEntries(ids.map(id => [id, cycle.includes(saved[id] as FanSpeed) ? saved[id] as FanSpeed : 'low']))
}

export function fanPlaybackRate(speed: FanSpeed, reducedMotion: boolean) {
  // The native animation has a one-second revolution. Reduced motion is gentler,
  // but still offers distinct speeds and never disables the other environmental loops.
  return FAN_SPEEDS[speed] / 60 * (reducedMotion ? 1 / 12 : 1)
}

// Change only playback rate, never the animation's currentTime or startTime.
// rAF runs for the 450ms acceleration ramp; steady rotation stays browser-managed.
export class FanRotation {
  private frame = 0
  constructor(private animation: Animation) {}

  setRate(target: number, smooth = true) {
    cancelAnimationFrame(this.frame)
    this.frame = 0
    if (!smooth) {
      this.animation.updatePlaybackRate(target)
      return
    }
    const from = this.animation.playbackRate
    let start: number | undefined
    const step = (time: number) => {
      start ??= time
      const progress = Math.min(1, (time - start) / 450)
      const eased = progress * progress * (3 - 2 * progress)
      this.animation.updatePlaybackRate(from + (target - from) * eased)
      this.frame = progress < 1 ? requestAnimationFrame(step) : 0
    }
    if (from !== target) this.frame = requestAnimationFrame(step)
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    this.frame = 0
  }
}
