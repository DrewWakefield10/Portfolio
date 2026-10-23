export const CAT_FRAMES = [
  { frame: 0, at: 0 },
  { frame: 1, at: 120 },
  { frame: 2, at: 280 },
  { frame: 3, at: 500 },
  { frame: 4, at: 1060 },
  { frame: 5, at: 1420 },
] as const
export const CAT_DURATION_MS = 1540
export const CAT_MEOW_AT_MS = 280

export function catKeyframes(reducedMotion: boolean): Keyframe[] {
  return [...CAT_FRAMES.map(({ frame, at }) => ({
    backgroundPositionX: `${(reducedMotion && frame === 1 ? 0 : frame) * 20}%`,
    offset: at / CAT_DURATION_MS,
    easing: 'steps(1, end)',
  })), { backgroundPositionX: '100%', offset: 1 }]
}
