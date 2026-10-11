import additionalTracks from './music-library.json'

export type MusicTheme = 'light' | 'dark'

export interface MusicTrack {
  id: string
  title: string
  artist?: string
  src: string
  theme: MusicTheme
  /** Optional attenuation measured at import; never changes the saved volume. */
  gain?: number
}

// Planned music is excluded. `npm run music:sync` verifies real files before
// exporting ready entries from public/music/catalog.json into this library.
export const MUSIC_PLAYLISTS: Record<MusicTheme, readonly MusicTrack[]> = {
  light: [
    ...(additionalTracks as MusicTrack[]).filter(track => track.theme === 'light'),
    { id: 'original-day', title: 'Original portfolio mix', src: '/music.mp3', theme: 'light' },
  ],
  dark: [
    ...(additionalTracks as MusicTrack[]).filter(track => track.theme === 'dark'),
    { id: 'original-night', title: 'Original portfolio mix', src: '/music.mp3', theme: 'dark' },
  ],
}

export const MUSIC_TRANSITION_MS = 1600
export const MUSIC_MAX_GAIN = 0.475468
export const AUDIO_STORAGE_KEY = 'portfolio-audio-v1'

export interface AudioPreferences {
  enabled: boolean
  volume: number
  muted: boolean
  shuffle: boolean
  effects: boolean
  selected: Record<MusicTheme, string>
}

export function readAudioPreferences(storage?: Pick<Storage, 'getItem'>): AudioPreferences {
  const defaults: AudioPreferences = {
    enabled: false, volume: 0.5, muted: false, shuffle: false, effects: true,
    selected: { light: MUSIC_PLAYLISTS.light[0]?.id ?? '', dark: MUSIC_PLAYLISTS.dark[0]?.id ?? '' },
  }
  try {
    const value = JSON.parse(storage?.getItem(AUDIO_STORAGE_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return defaults
    return {
      enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume)
        ? Math.min(1, Math.max(0, value.volume)) : defaults.volume,
      muted: typeof value.muted === 'boolean' ? value.muted : defaults.muted,
      shuffle: typeof value.shuffle === 'boolean' ? value.shuffle : defaults.shuffle,
      effects: typeof value.effects === 'boolean' ? value.effects : defaults.effects,
      selected: {
        light: typeof value.selected?.light === 'string' ? value.selected.light : defaults.selected.light,
        dark: typeof value.selected?.dark === 'string' ? value.selected.dark : defaults.selected.dark,
      },
    }
  } catch {
    return defaults
  }
}

export function adjacentTrack(
  tracks: readonly MusicTrack[], currentId: string, direction: -1 | 1,
  shuffle: boolean, random = Math.random,
): MusicTrack | undefined {
  if (!tracks.length) return undefined
  const index = tracks.findIndex(track => track.id === currentId)
  if (shuffle && tracks.length > 1) {
    const candidates = tracks.filter(track => track.id !== currentId)
    return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]
  }
  return tracks[((index < 0 ? (direction === 1 ? -1 : 0) : index) + direction + tracks.length) % tracks.length]
}
