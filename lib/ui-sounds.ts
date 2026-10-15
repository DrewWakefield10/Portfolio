export const UI_TONES = {
  zap: [
    { start: 1400, end: 110, duration: 0.090, peak: 0.028 },
    { start: 1600, end: 130, duration: 0.080, peak: 0.026 },
    { start: 1250, end: 100, duration: 0.100, peak: 0.027 },
  ],
  fan: [
    { start: 380, end: 210, duration: 0.070, peak: 0.021 },
    { start: 420, end: 240, duration: 0.060, peak: 0.020 },
    { start: 460, end: 270, duration: 0.080, peak: 0.019 },
  ],
  phone: [
    { start: 440, end: 480, duration: 0.080, peak: 0.020 },
    { start: 460, end: 500, duration: 0.075, peak: 0.019 },
    { start: 420, end: 460, duration: 0.085, peak: 0.018 },
  ],
  clock: [
    { start: 1100, end: 540, duration: 0.025, peak: 0.018 },
    { start: 1040, end: 510, duration: 0.030, peak: 0.017 },
    { start: 1160, end: 570, duration: 0.022, peak: 0.016 },
  ],
  paper: [
    { start: 760, end: 280, duration: 0.045, peak: 0.020 },
    { start: 720, end: 260, duration: 0.050, peak: 0.019 },
    { start: 800, end: 300, duration: 0.040, peak: 0.018 },
  ],
  switch: [
    { start: 320, end: 180, duration: 0.080, peak: 0.045 },
    { start: 340, end: 190, duration: 0.070, peak: 0.042 },
    { start: 300, end: 170, duration: 0.090, peak: 0.044 },
  ],
  skill: [
    { start: 940, end: 1260, duration: 0.075, peak: 0.024 },
    { start: 1000, end: 1380, duration: 0.065, peak: 0.023 },
    { start: 880, end: 1180, duration: 0.085, peak: 0.022 },
  ],
  hover: [
    { start: 620, end: 480, duration: 0.065, peak: 0.030 },
    { start: 580, end: 460, duration: 0.075, peak: 0.028 },
    { start: 660, end: 520, duration: 0.055, peak: 0.026 },
  ],
  click: [
    { start: 520, end: 780, duration: 0.095, peak: 0.095 },
    { start: 490, end: 720, duration: 0.105, peak: 0.090 },
    { start: 550, end: 820, duration: 0.085, peak: 0.088 },
  ],
} as const

export type UiSoundKind = keyof typeof UI_TONES

export function hoverSoundKind(value: string | undefined): UiSoundKind {
  return value === 'skill' || value === 'phone' || value === 'clock' || value === 'paper' ? value : 'hover'
}

// Short, complementary variations share one context and one released voice.
export class UiSounds {
  private context: AudioContext | null = null
  private voice: { gain: GainNode; oscillators: OscillatorNode[] } | null = null
  private lastHover = -Infinity
  private lastClick = -Infinity
  private disposed = false
  private generation = 0
  private variation: Partial<Record<UiSoundKind, number>> = {}

  unlock = () => {
    if (this.disposed) return Promise.resolve()
    try {
      this.context ??= new AudioContext({ latencyHint: 'interactive' })
      if (this.context.state === 'suspended') return this.context.resume().catch(() => {})
    } catch { /* Browsers without Web Audio stay silent. */ }
    return Promise.resolve()
  }

  playFromGesture(kind: UiSoundKind) {
    const generation = this.generation
    const ready = this.unlock()
    if (this.context?.state === 'running') this.play(kind)
    else void ready.then(() => {
      // A mute/dispose during an asynchronous resume must cancel the pending tone.
      if (generation === this.generation) this.play(kind)
    })
  }

  play(kind: UiSoundKind) {
    const context = this.context
    if (!context || context.state !== 'running' || this.disposed) return
    const now = context.currentTime
    const activation = kind === 'click' || kind === 'switch' || kind === 'fan' || kind === 'zap'
    if (!activation && (now - this.lastHover < 0.09 || now - this.lastClick < 0.12)) return
    if (activation && now - this.lastClick < 0.045) return
    if (activation) this.lastClick = now
    else this.lastHover = now

    // Release the previous voice rather than stacking tones or truncating a waveform.
    if (this.voice) {
      const old = this.voice
      old.gain.gain.cancelScheduledValues(now)
      old.gain.gain.setTargetAtTime(0.0001, now, 0.002)
      old.oscillators.forEach(oscillator => { try { oscillator.stop(now + 0.008) } catch {} })
    }
    const tones = UI_TONES[kind]
    const variation = this.variation[kind] ?? 0
    this.variation[kind] = variation + 1
    const tone = tones[variation % tones.length]
    const { duration, peak } = tone
    const gain = context.createGain()
    const oscillators = [context.createOscillator()]
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    gain.connect(context.destination)
    const voice = { gain, oscillators }
    this.voice = voice
    oscillators.forEach(oscillator => {
      oscillator.type = kind === 'zap' ? 'sawtooth' : kind === 'skill' || kind === 'switch' || kind === 'phone' || kind === 'paper' || kind === 'fan' ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(tone.start, now)
      oscillator.frequency.exponentialRampToValueAtTime(tone.end, now + duration * 0.65)
      oscillator.connect(gain)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
        if (this.voice === voice) this.voice = null
      }
      oscillator.start(now)
      oscillator.stop(now + duration + 0.01)
    })
  }

  silence() {
    this.generation++
    const context = this.context
    if (!context || !this.voice) return
    this.voice.gain.gain.cancelScheduledValues(context.currentTime)
    this.voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.002)
  }

  dispose() {
    this.disposed = true
    this.silence()
    if (this.context) void this.context.close().catch(() => {})
    this.context = null
    this.voice = null
  }
}
