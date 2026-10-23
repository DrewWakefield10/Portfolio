'use client'

import { useEffect, type RefObject } from 'react'
import scene from '@/lib/store-scene.json'
import { FishReaction, type Point } from '@/lib/fish-reaction'

export function useFishReaction(root: RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const svg = root.current
    const stage = svg?.closest('.store-scene')
    if (!svg || !stage) return
    const model = new FishReaction(scene.fish, scene.tank)
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const actors = scene.fish.map(fish => {
      const swim = svg.querySelector<SVGGElement>(`[data-fish="${fish.id}"]`)!
      return { swim, escape: swim.parentElement!, facing: swim.querySelector<SVGGElement>('.fish-facing')!,
        heading: swim.querySelector<SVGGElement>('.fish-heading')!, previous: null as Point | null,
        visualFacing: 1, rate: 1, turn: null as Animation | null,
        loops: [] as Animation[], fins: [] as Animation[] }
    })
    let frame = 0, previousTime = 0
    const pose = () => actors.map(actor => {
      const translation = new DOMMatrix(getComputedStyle(actor.swim).transform)
      const facing = new DOMMatrix(getComputedStyle(actor.facing).transform).a
      return { x: translation.e, y: translation.f, facing }
    })
    const rates = (index: number, rate: number) => {
      const actor = actors[index]
      if (actor.rate === rate || (rate !== 1 && Math.abs(actor.rate - rate) < 0.0001)) return
      actor.rate = rate
      actor.loops.forEach(animation => animation.updatePlaybackRate(rate))
      actor.fins.forEach(animation => animation.updatePlaybackRate(Math.min(3.5, 1 + (rate - 1) * 0.7)))
    }
    const settle = () => {
      cancelAnimationFrame(frame)
      frame = 0
      model.finish(performance.now())
      svg.dataset.fishState = 'idle'
      actors.forEach((actor, index) => {
        rates(index, 1)
        actor.swim.dataset.startleRate = '1'
        actor.previous = null
        const from = actor.heading.style.transform || 'scaleX(1)'
        actor.turn?.cancel()
        actor.heading.style.transform = 'scaleX(1)'
        if (!document.hidden && !media.matches && from !== 'scaleX(1)') {
          actor.turn = actor.heading.animate([{ transform: from }, { transform: 'scaleX(1)' }], { duration: 120, easing: 'ease-out' })
        }
      })
    }
    const step = (now: number) => {
      if (document.hidden || svg.dataset.active !== 'true') { settle(); return }
      const elapsed = Math.max(0.001, (now - previousTime) / 1000)
      const dt = Math.min(0.05, elapsed)
      previousTime = now
      // Batch all twelve style reads before any writes. No layout rectangles are read.
      const current = pose()
      const velocity = current.map((p, i) => {
        const last = actors[i].previous ?? p
        actors[i].previous = { x: p.x, y: p.y }
        return { x: (p.x - last.x) / elapsed, y: (p.y - last.y) / elapsed }
      })
      const samples = model.sample(now, dt, velocity)
      samples.forEach((sample, i) => {
        const actor = actors[i]
        actor.escape.setAttribute('transform', `translate(${sample.offset.x.toFixed(3)} ${sample.offset.y.toFixed(3)})`)
        actor.swim.dataset.startleRate = sample.rate.toFixed(3)
        rates(i, sample.rate)
        if (sample.strength > 0.08) {
          if (!media.matches) {
            const target = Math.abs(sample.velocity.x) > 0.5
              ? Math.sign(sample.velocity.x) * (scene.fish[i].facing === 'right' ? 1 : -1) : current[i].facing
            actor.visualFacing += (target - actor.visualFacing) * Math.min(1, dt / 0.07)
          }
          // Compensate the rapid native turn loop; reduced motion keeps a steady
          // heading while still honoring the explicitly requested click speed.
          actor.heading.style.transform = `scaleX(${actor.visualFacing / (current[i].facing || 1)})`
        }
      })
      svg.dataset.fishState = model.state
      if (model.state === 'idle') settle()
      else frame = requestAnimationFrame(step)
    }
    const tap = (event: Event) => {
      if (document.hidden || svg.dataset.active !== 'true') return
      const point = (event as CustomEvent<Point>).detail
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return
      const current = pose()
      const positions = current.map((p, i) => ({
        x: scene.fish[i].x + scene.fish[i].width / 2 + p.x + model.fish[i].offset.x,
        y: scene.fish[i].y + scene.fish[i].height / 2 + p.y + model.fish[i].offset.y,
      }))
      const fresh = model.state === 'idle'
      if (!model.tap(performance.now(), point, positions, media.matches)) return
      svg.dataset.fishState = model.state
      svg.dataset.fishReactionEnd = String(model.ends)
      svg.dataset.fishTapCount = String(Number(svg.dataset.fishTapCount ?? 0) + 1)
      if (fresh) {
        actors.forEach((actor, i) => {
          const heading = new DOMMatrix(getComputedStyle(actor.heading).transform).a
          actor.turn?.cancel()
          actor.visualFacing = current[i].facing * heading
          actor.heading.style.transform = `scaleX(${heading})`
          actor.previous = { x: current[i].x, y: current[i].y }
          actor.loops = [...actor.swim.getAnimations(), ...actor.facing.getAnimations()]
          actor.fins = Array.from(actor.swim.querySelectorAll('.fish-tail,.fish-body')).flatMap(element => element.getAnimations())
        })
        previousTime = performance.now()
        frame = requestAnimationFrame(step)
      }
    }
    const visibility = () => { if (document.hidden) settle() }
    svg.setAttribute('data-fish-state', 'idle')
    stage.addEventListener('aquarium-tap', tap)
    document.addEventListener('visibilitychange', visibility)
    media.addEventListener('change', settle)
    return () => {
      settle()
      actors.forEach(actor => actor.turn?.cancel())
      stage.removeEventListener('aquarium-tap', tap)
      document.removeEventListener('visibilitychange', visibility)
      media.removeEventListener('change', settle)
    }
  }, [root])
}
