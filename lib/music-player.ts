import {
  AUDIO_STORAGE_KEY, MUSIC_MAX_GAIN, MUSIC_PLAYLISTS, MUSIC_TRANSITION_MS,
  readAudioPreferences, type AudioPreferences, type MusicTheme, type MusicTrack,
} from './music'
import { MusicRotation } from './music-rotation'

export interface MusicState {
  theme: MusicTheme
  track?: MusicTrack
  playing: boolean
  pending: boolean
  volume: number
  muted: boolean
  shuffle: boolean
  effects: boolean
  message: string
}

interface PlayerOptions {
  playlists?: Record<MusicTheme, readonly MusicTrack[]>
  transitionMs?: number
}

// One persistent media element. A generation token cancels outdated fades and
// play promises when the user pauses, skips, or changes themes quickly.
export class MusicPlayer {
  private audio: HTMLAudioElement | null = null
  private source: string | null = null
  private trackGain = 1
  private storage?: Storage
  private preferences: AudioPreferences = readAudioPreferences()
  private playlists: Record<MusicTheme, readonly MusicTrack[]>
  private transitionMs: number
  private operation = 0
  private fadeFrame = 0
  private gainFrame = 0
  private cancelFade?: () => void
  private failed = new Set<string>()
  private rotation = { light: new MusicRotation(), dark: new MusicRotation() }
  private listeners = new Set<() => void>()
  private state: MusicState

  constructor({ playlists = MUSIC_PLAYLISTS, transitionMs = MUSIC_TRANSITION_MS }: PlayerOptions = {}) {
    this.playlists = playlists
    this.transitionMs = transitionMs
    this.state = {
      theme: 'light', track: playlists.light[0], playing: false, pending: false,
      volume: 0.5, muted: false, shuffle: false, effects: true, message: '',
    }
  }

  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private update(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(listener => listener())
  }

  private save() {
    try { this.storage?.setItem(AUDIO_STORAGE_KEY, JSON.stringify(this.preferences)) } catch { /* Private browsing. */ }
  }

  connect(audio: HTMLAudioElement, theme: MusicTheme, storage?: Storage) {
    this.audio = audio
    this.storage = storage
    this.preferences = readAudioPreferences(storage)
    const track = this.selectedTrack(theme)
    this.update({
      theme, track, playing: false, pending: this.preferences.enabled,
      volume: this.preferences.volume, muted: this.preferences.muted,
      shuffle: this.preferences.shuffle, effects: this.preferences.effects,
      message: this.preferences.enabled ? 'Press play or interact to resume music.' : '',
    })
    audio.preload = 'metadata'
    audio.loop = false
    audio.volume = this.gain()
    audio.muted = this.preferences.muted
    audio.addEventListener('ended', this.onEnded)
    audio.addEventListener('error', this.onError)
    audio.addEventListener('pause', this.onPause)
    if (track) this.load(track)
  }

  disconnect() {
    this.cancelOperation()
    const audio = this.audio
    this.audio = null
    this.source = null
    if (!audio) return
    audio.removeEventListener('ended', this.onEnded)
    audio.removeEventListener('error', this.onError)
    audio.removeEventListener('pause', this.onPause)
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  private gain() { return this.preferences.muted ? 0 : this.preferences.volume * MUSIC_MAX_GAIN * this.trackGain }

  private selectedTrack(theme: MusicTheme) {
    return this.playlists[theme].find(track => track.id === this.preferences.selected[theme])
      ?? this.playlists[theme][0]
  }

  private load(track: MusicTrack, restart = true) {
    if (!this.audio) return
    this.trackGain = typeof track.gain === 'number' && Number.isFinite(track.gain)
      ? Math.max(0, Math.min(1, track.gain)) : 1
    this.preferences.selected[this.state.theme] = track.id
    this.update({ track })
    this.rotation[this.state.theme].remember(track.id)
    if (restart) {
      this.source = track.src
      this.audio.src = track.src
      this.audio.load()
    }
    if (this.audio.paused) this.audio.volume = this.gain()
    this.save()
  }

  private cancelOperation() {
    this.operation += 1
    if (this.gainFrame) cancelAnimationFrame(this.gainFrame)
    this.gainFrame = 0
    this.cancelFade?.()
    this.cancelFade = undefined
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame)
    this.fadeFrame = 0
    return this.operation
  }

  private fade(target: number | (() => number), duration: number, operation: number): Promise<boolean> {
    const audio = this.audio
    if (!audio || operation !== this.operation) return Promise.resolve(false)
    const from = audio.volume
    const getTarget = typeof target === 'function' ? target : () => target
    if (duration <= 0 || from === getTarget()) {
      audio.volume = getTarget()
      return Promise.resolve(true)
    }
    return new Promise(resolve => {
      const started = performance.now()
      this.cancelFade = () => resolve(false)
      const tick = (now: number) => {
        if (!this.audio || operation !== this.operation) { resolve(false); return }
        const fraction = Math.min(1, (now - started) / duration)
        audio.volume = Math.max(0, Math.min(1, from + (getTarget() - from) * fraction))
        if (fraction < 1) this.fadeFrame = requestAnimationFrame(tick)
        else {
          this.fadeFrame = 0
          this.cancelFade = undefined
          resolve(true)
        }
      }
      this.fadeFrame = requestAnimationFrame(tick)
    })
  }

  private async start(operation: number, fadeIn = false) {
    const audio = this.audio
    if (!audio || !this.state.track || !this.preferences.enabled || operation !== this.operation) return
    audio.volume = fadeIn ? 0 : this.gain()
    try {
      await audio.play()
      if (operation !== this.operation || !this.audio) return
      this.update({ playing: true, pending: false, message: '' })
      if (fadeIn) await this.fade(() => this.gain(), this.transitionMs / 2, operation)
    } catch (error) {
      if (operation !== this.operation || !this.audio) return
      if (error instanceof Error && error.name === 'NotAllowedError') {
        this.update({ playing: false, pending: true, message: 'Press play to allow music.' })
      } else if (!(error instanceof Error && error.name === 'AbortError')) {
        this.onError()
      }
    }
  }

  play = () => {
    if (!this.audio) return
    this.failed.clear()
    this.preferences.enabled = true
    this.save()
    if (!this.state.track) {
      this.preferences.enabled = false
      this.save()
      this.update({ message: 'No tracks in this playlist.', pending: false })
      return
    }
    // Retrying a failed track requires reloading its media resource.
    if (this.audio.error) this.load(this.state.track)
    const operation = this.cancelOperation()
    void this.start(operation)
  }

  pause = () => {
    this.cancelOperation()
    this.preferences.enabled = false
    this.audio?.pause()
    this.update({ playing: false, pending: false, message: '' })
    this.save()
  }

  resumeAfterGesture = () => {
    if (this.state.pending && this.preferences.enabled && !this.preferences.muted && !this.state.playing) {
      const operation = this.cancelOperation()
      void this.start(operation)
    }
  }

  async setTheme(theme: MusicTheme) {
    if (theme === this.state.theme) return
    const track = this.selectedTrack(theme)
    await this.switchTrack(theme, track)
  }

  private async switchTrack(theme: MusicTheme, track?: MusicTrack) {
    const operation = this.cancelOperation()
    const audio = this.audio
    const wasPlaying = this.state.playing && !!audio && !audio.paused
    const sameSource = !!track && track.src === this.source && !audio?.error
    // Commit theme and metadata immediately so rapid theme changes always see
    // the latest target, even while the outgoing sound is still fading.
    this.update({ theme, track, message: '' })
    if (track) {
      this.preferences.selected[theme] = track.id
      this.save()
    }
    if (!audio) return
    const audible = wasPlaying && !this.preferences.muted && this.preferences.volume > 0
    if (audible && !await this.fade(0, this.transitionMs / 2, operation)) return
    if (operation !== this.operation) return
    if (track && sameSource) {
      // Shared songs continue at their current position across themes.
      this.load(track, false)
      if (audible && this.preferences.enabled) await this.fade(() => this.gain(), this.transitionMs / 2, operation)
      else if (this.preferences.muted || this.preferences.volume === 0) {
        audio.pause()
        this.update({ playing: false })
      }
      return
    }
    audio.pause()
    this.update({ playing: false })
    if (!track) {
      this.source = null
      audio.removeAttribute('src')
      audio.load()
      this.update({ message: 'No tracks in this playlist.', pending: false })
      return
    }
    this.load(track)
    if (wasPlaying && this.preferences.enabled && !this.preferences.muted && this.preferences.volume > 0) {
      await this.start(operation, audible)
    }
    // Paused, muted, blocked, or zero-volume music never starts on theme change.
  }

  step = (direction: -1 | 1) => {
    const tracks = this.playlists[this.state.theme].filter(track => !this.failed.has(track.src))
    if (tracks.length < 2) return
    const track = this.rotation[this.state.theme].take(tracks, this.state.track?.id ?? '', direction, this.preferences.shuffle)
    if (track) void this.switchTrack(this.state.theme, track)
  }

  setVolume = (volume: number) => {
    this.preferences.volume = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0.5))
    this.update({ volume: this.preferences.volume })
    this.save()
    // Keep an in-flight source switch intact; its fade-in reads the latest gain.
    if (this.gainFrame) cancelAnimationFrame(this.gainFrame)
    const audio = this.audio
    if (!this.cancelFade && audio) {
      const from = audio.volume
      const started = performance.now()
      const operation = this.operation
      const tick = (now: number) => {
        if (!this.audio || operation !== this.operation || this.cancelFade) return
        const fraction = Math.min(1, (now - started) / 100)
        audio.volume = from + (this.gain() - from) * fraction
        if (fraction < 1) this.gainFrame = requestAnimationFrame(tick)
        else this.gainFrame = 0
      }
      this.gainFrame = requestAnimationFrame(tick)
    }
  }

  toggleMute = () => {
    this.preferences.muted = !this.preferences.muted
    if (this.audio) {
      this.audio.muted = this.preferences.muted
      this.audio.volume = this.gain()
    }
    this.update({ muted: this.preferences.muted })
    this.save()
    if (!this.preferences.muted && this.preferences.enabled && !this.state.playing) this.play()
  }

  toggleShuffle = () => {
    this.preferences.shuffle = !this.preferences.shuffle
    Object.values(this.rotation).forEach(rotation => rotation.resetShuffle())
    this.update({ shuffle: this.preferences.shuffle })
    this.save()
  }

  toggleEffects = () => {
    this.preferences.effects = !this.preferences.effects
    this.update({ effects: this.preferences.effects })
    this.save()
  }

  private onPause = () => {
    if (this.state.playing) this.update({ playing: false })
  }

  private onEnded = () => {
    if (!this.preferences.enabled) return
    const tracks = this.playlists[this.state.theme].filter(track => !this.failed.has(track.src))
    const track = this.rotation[this.state.theme].take(tracks, this.state.track?.id ?? '', 1, this.preferences.shuffle)
    if (!track) { this.onError(); return }
    const operation = this.cancelOperation()
    this.load(track)
    void this.start(operation, true)
  }

  private onError = () => {
    if (!this.audio || !this.state.track) return
    this.failed.add(this.source ?? this.state.track.src)
    this.cancelOperation()
    this.audio.pause()
    this.update({ playing: false })
    const tracks = this.playlists[this.state.theme].filter(track => !this.failed.has(track.src))
    const next = this.rotation[this.state.theme].take(tracks, this.state.track.id, 1, this.preferences.shuffle)
    if (this.preferences.enabled && next) {
      this.load(next)
      void this.start(this.operation, true)
    } else {
      this.preferences.enabled = false
      this.update({ pending: false, message: 'Music unavailable. Press play to retry.' })
      this.save()
    }
  }
}
