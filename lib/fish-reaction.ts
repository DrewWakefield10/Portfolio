export interface Point { x: number; y: number }
export interface FishGeometry extends Point { width: number; height: number; dx: number; dy: number; duration: number }
export interface TankGeometry extends Point { width: number; height: number }
export interface FishSample { offset: Point; rate: number; strength: number; direction: Point; velocity: Point }
export const FISH_REACTION_MS = 1000
export const FISH_REACTION_CAP_MS = 1000
export const FISH_SWIM_TEMPO = 1.4 * 1.6
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
const smooth = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t) }
const unit = (x: number, y: number): Point => { const length = Math.hypot(x, y) || 1; return { x: x / length, y: y / length } }
const mix = (a: number, b: number, t: number) => a + (b - a) * t

interface FishState {
  offset: Point; direction: Point; target: Point; strength: number; attackFrom: number
  delay: number; peak: number; normalSpeed: number
  bounds: { left: number; right: number; top: number; bottom: number }
}

// Pure, bounded steering model. Existing browser-managed swim paths remain alive.
// Offsets persist after recovery: fish resume the same paths from their new locations.
export class FishReaction {
  readonly fish: FishState[]
  state: 'idle' | 'startled' | 'recovering' = 'idle'
  started = 0
  ends = 0
  private attack = 0
  private escapeUntil = 0
  private lastTap = -Infinity
  private restUntil = -Infinity
  private sequence = 0
  private reduced = false

  constructor(readonly geometry: readonly FishGeometry[], readonly tank: TankGeometry) {
    this.fish = geometry.map(fish => ({
      offset: { x: 0, y: 0 }, direction: { x: 1, y: 0 }, target: { x: 1, y: 0 },
      strength: 0, attackFrom: 0, delay: 0, peak: 1,
      // Maximum derivative of the existing ease-in-out out-and-back CSS path.
      normalSpeed: 3.45 * Math.hypot(fish.dx, fish.dy) / (fish.duration / FISH_SWIM_TEMPO),
      bounds: {
        left: tank.x + 8 - fish.x - Math.min(0, fish.dx),
        right: tank.x + tank.width - 8 - fish.x - fish.width - Math.max(0, fish.dx),
        top: tank.y + 8 - fish.y - Math.min(0, fish.dy),
        bottom: tank.y + tank.height - 8 - fish.y - fish.height - Math.max(0, fish.dy),
      },
    }))
  }

  tap(now: number, point: Point, positions: readonly Point[], reduced = false) {
    if (now < this.restUntil || now - this.lastTap < 160) return false
    const fresh = this.state === 'idle'
    if (!fresh && this.started + FISH_REACTION_CAP_MS - now < 250) return false
    this.lastTap = now
    this.sequence++
    this.reduced = reduced
    if (fresh) {
      this.started = now
      this.ends = now + FISH_REACTION_MS
      this.escapeUntil = now + 550
    } else {
      // Retarget within this one-second burst; tapping never prolongs it.
      this.escapeUntil = Math.min(this.ends - 250, Math.max(this.escapeUntil, now + 100))
    }
    this.attack = now
    const distances = positions.map(p => Math.hypot(p.x - point.x, p.y - point.y))
    const closest = Math.min(...distances)
    this.fish.forEach((fish, index) => {
      const p = positions[index]
      const variation = Math.sin(index * 2.4 + this.sequence * 1.7)
      const dx = p.x - point.x, dy = p.y - point.y
      const spread = variation * 0.32
      const away = Math.hypot(dx, dy) < 2 ? unit(Math.cos(index * 2.4), Math.sin(index * 2.4)) : unit(dx, dy)
      fish.target = unit(away.x * Math.cos(spread) - away.y * Math.sin(spread), away.y * Math.cos(spread) + away.x * Math.sin(spread))
      if (fresh) {
        fish.direction = { ...fish.target }
        const proximity = 1 - clamp(distances[index] / Math.hypot(this.tank.width, this.tank.height), 0, 1)
        fish.peak = clamp(100 + proximity * 90 + variation * 8, 100, 200)
      }
      fish.attackFrom = fish.strength
      fish.delay = clamp((distances[index] - closest) * 0.1 + index * 2, 0, 45)
    })
    this.state = 'startled'
    return true
  }

  sample(now: number, dt: number, baselineVelocity: readonly Point[]): FishSample[] {
    dt = clamp(dt, 0.001, 0.05)
    const ended = now >= this.ends
    if (ended && this.state !== 'idle') this.finish(now)
    if (this.state !== 'idle') this.state = now >= this.escapeUntil ? 'recovering' : 'startled'
    return this.fish.map((fish, index) => {
      const onset = smooth((now - this.attack - fish.delay) / 80)
      const recovery = 1 - smooth((now - this.escapeUntil) / Math.max(1, this.ends - this.escapeUntil))
      fish.strength = this.state === 'idle' ? 0 : mix(fish.attackFrom, 1, onset) * recovery
      const s = fish.strength
      // Fast bursts must turn promptly at walls instead of lingering against them.
      const turnTime = 0.14 * Math.min(1, 20 / fish.peak)
      const direction = unit(mix(fish.direction.x, fish.target.x, Math.min(1, dt / turnTime)), mix(fish.direction.y, fish.target.y, Math.min(1, dt / turnTime)))
      fish.direction = direction
      const rate = 1 + (fish.peak - 1) * s
      const base = baselineVelocity[index]
      const speed = fish.normalSpeed * (this.reduced ? 0.175 : 1)
      const steering = s
      const target = { x: mix(base.x, direction.x * speed * fish.peak, steering), y: mix(base.y, direction.y * speed * fish.peak, steering) }
      // Allowed world velocities keep the entire idle path inside an eight-pixel margin.
      const { bounds: b, offset: o } = fish
      const projected = {
        x: clamp(target.x, base.x + (b.left - o.x) / dt, base.x + (b.right - o.x) / dt),
        y: clamp(target.y, base.y + (b.top - o.y) / dt, base.y + (b.bottom - o.y) / dt),
      }
      const limit = speed * 200
      // The baseline is feasible. Intersect the velocity rectangle with the speed
      // circle by blending toward it if a wall-constrained vector exceeds the cap.
      if (Math.hypot(projected.x, projected.y) > limit && Math.hypot(base.x, base.y) <= limit) {
        let low = 0, high = 1
        for (let i = 0; i < 16; i++) {
          const t = (low + high) / 2
          if (Math.hypot(mix(base.x, projected.x, t), mix(base.y, projected.y, t)) > limit) high = t
          else low = t
        }
        projected.x = mix(base.x, projected.x, low)
        projected.y = mix(base.y, projected.y, low)
      }
      if (s > 0) {
        fish.offset = {
          x: clamp(o.x + (projected.x - base.x) * dt, b.left, b.right),
          y: clamp(o.y + (projected.y - base.y) * dt, b.top, b.bottom),
        }
        if ((fish.offset.x <= b.left + 0.5 && direction.x < 0) || (fish.offset.x >= b.right - 0.5 && direction.x > 0)) fish.target.x = -fish.target.x
        if ((fish.offset.y <= b.top + 0.5 && direction.y < 0) || (fish.offset.y >= b.bottom - 0.5 && direction.y > 0)) fish.target.y = -fish.target.y
      }
      return { offset: { ...fish.offset }, rate, strength: s, direction, velocity: projected }
    })
  }

  finish(now: number) {
    if (this.state !== 'idle' && this.ends - this.started >= FISH_REACTION_CAP_MS) this.restUntil = now + 200
    this.state = 'idle'
    this.fish.forEach(fish => { fish.strength = 0; fish.attackFrom = 0 })
  }
}
