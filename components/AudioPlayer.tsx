'use client'

import { useId, useState, type CSSProperties } from 'react'
import { Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useAudio } from '@/context/AudioContext'

export function AudioPlayer() {
  const { player, theme, track, playing, volume, muted, shuffle, effects, message } = useAudio()
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsId = useId()
  const trackLabel = track ? `${track.title}${track.artist ? ` — ${track.artist}` : ''}` : 'No tracks'
  return (
    <div className="music-player flex flex-wrap items-center gap-1.5 max-w-full" role="group" aria-label="Background music" data-music-controls>
      <button type="button" onClick={() => playing ? player.pause() : player.play()}
        className="retro-button flex items-center justify-center" title={playing ? 'Pause music' : 'Play music'}
        aria-label={playing ? 'Pause music' : 'Play music'}>
        {playing ? <svg className="pixel-pause" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M2 2h5v12H2zM9 2h5v12H9z" />
          <path d="M3 3h1v10H3zM10 3h1v10h-1z" fill="var(--window-bg)" />
        </svg> : <svg className="pixel-control-icon" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M7 6h2v4H7zM4 4h2v2H5v4h1v2H4zM10 4h2v8h-2v-2h1V6h-1zM1 1h2v2H2v10h1v2H1zM13 1h2v14h-2v-2h1V3h-1z" />
        </svg>}
      </button>
      <button type="button" onClick={() => player.step(-1)} className="retro-button" title="Previous track" aria-label="Previous track">
        <SkipBack size={14} aria-hidden />
      </button>
      <button type="button" onClick={() => player.step(1)} className="retro-button" title="Next track" aria-label="Next track">
        <SkipForward size={14} aria-hidden />
      </button>
      <span className="music-track w-32 min-w-0 leading-tight text-xs" title={trackLabel}>
        <span className="radio-station block">{theme === 'light' ? 'daytime radio' : 'nighttime radio'}</span>
        <span className="block truncate">{trackLabel}</span>
      </span>
      <button type="button" onClick={player.toggleMute} className="retro-button" title={muted ? 'Unmute music' : 'Mute music'}
        aria-label={muted ? 'Unmute music' : 'Mute music'} aria-pressed={muted}>
        {muted ? <VolumeX size={14} aria-hidden /> : <Volume2 size={14} aria-hidden />}
      </button>
      <button type="button" className="retro-button audio-options-toggle" aria-label="More music controls"
        aria-expanded={optionsOpen} aria-controls={optionsId} onClick={() => setOptionsOpen(open => !open)}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M1 6h3v4H1zM6 6h4v4H6zM12 6h3v4h-3z" />
        </svg>
      </button>
      <div id={optionsId} className="audio-options" data-expanded={optionsOpen}>
        <span className="mobile-track-title text-xs"><span className="radio-station block">{theme === 'light' ? 'daytime radio' : 'nighttime radio'}</span>{trackLabel}</span>
      <label className="flex items-center gap-1 text-xs">
        <span className="sr-only">Music volume</span>
        <input type="range" min="0" max="100" step="1" value={Math.round(volume * 100)}
          onChange={event => player.setVolume(Number(event.target.value) / 100)}
          aria-label="Music volume" aria-valuetext={`${Math.round(volume * 100)} percent`}
          style={{ '--volume': `${Math.round(volume * 100)}%` } as CSSProperties}
          className="pixel-volume" />
      </label>
      <button type="button" onClick={player.toggleShuffle} className="retro-button" title={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
        aria-label="Shuffle" aria-pressed={shuffle}>
        <Shuffle size={14} aria-hidden />
      </button>
      <button type="button" onClick={player.toggleEffects} className="retro-button" data-sound="off"
        title={effects ? 'Disable UI sounds' : 'Enable UI sounds'} aria-label="UI sounds" aria-pressed={effects}>
        <span>UI FX {effects ? 'ON' : 'OFF'}</span>
      </button>
      </div>
      <span role="status" className="basis-full text-xs text-foreground/80">{message}</span>
    </div>
  )
}
