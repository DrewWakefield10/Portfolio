import { MUSIC_PLAYLISTS } from './music'

export const creativeCredits = [
  {
    id: 'wallpaper', title: 'WALLPAPER.ART', creator: 'Pixel Jeff',
    description: 'Original store wallpaper artwork by Pixel Jeff. Day/night adaptations and interactive details were added for this portfolio.',
    href: 'https://pixeljeff1995.artstation.com/', linkLabel: 'Visit Pixel Jeff’s portfolio',
  },
  {
    id: 'inspiration', title: 'INSPIRATION.WEB', creator: 'shar’s desktop',
    description: 'This portfolio’s concept and windowed browsing experience were inspired by shar’s desktop.',
    href: 'https://www.sharyap.com/', linkLabel: 'Explore shar’s desktop',
  },
] as const

interface MusicReference {
  credit: string
  href?: string
  note?: string
  sourceLabel?: string
  listenHref?: string
}

// Official song references are distinct from the source of a specific supplied recording.
// Add exact recording links only after their identity is confirmed; never guess from a common title.
const musicReferences: Partial<Record<string, MusicReference>> = {
  'supplied-day-remember-summer-days': {
    credit: 'Anri', href: 'https://lnk.to/bfBsW1TB',
  },
  'supplied-day-without-u': {
    credit: 'Thelma Aoyama feat. 4Minute', href: 'https://www.universal-music.co.jp/aoyama-thelma/products/upch-5700/',
  },
  'supplied-day-fairground': {
    credit: 'Pop Culture', href: 'https://youtu.be/EWZw-2v23_c',
    sourceLabel: 'Tama’s Little Music Shop', listenHref: 'https://lofihiphop.de/fairground',
  },
  'supplied-day-shibuya-sky': {
    credit: 'Dust Diggers & Hicks', href: 'https://youtu.be/O2I40GJJxqM',
    sourceLabel: 'Tama’s Little Music Shop', listenHref: 'https://lofihiphop.de/shibuyasky',
  },
  'supplied-night-fool-parsley': {
    credit: 'Fool Parsley', href: 'https://youtu.be/_SCGub7zIjs',
    sourceLabel: 'Tama’s Little Music Shop', listenHref: 'https://lofihiphop.de/anyways',
  },
  'supplied-night-when-you-re-ready': {
    credit: 'ARISU', href: 'https://youtu.be/yAlbyZx4aqw',
    sourceLabel: 'Tama’s Little Music Shop', listenHref: 'https://lofihiphop.de/whenyourready',
  },
  'supplied-night-midnight-pretenders': {
    credit: 'Original song: Tomoko Aran', href: 'https://music.apple.com/us/song/midnight-pretenders/339701060',
    note: 'Exact recording/version still being confirmed.',
  },
  'supplied-night-wasurerarenaino': {
    credit: 'Original song: Sakanaction', href: 'https://www.jvcmusic.co.jp/-/Discography/A020936/VIDL-30565.html',
    note: 'Exact recording/version still being confirmed.',
  },
}

const seenSources = new Set<string>()
export const musicCredits = [...MUSIC_PLAYLISTS.light, ...MUSIC_PLAYLISTS.dark]
  .filter(track => {
    if (seenSources.has(track.src)) return false
    seenSources.add(track.src)
    return true
  })
  .map(track => ({
    id: track.id,
    title: track.title,
    theme: track.theme === 'light' ? 'Daytime' : 'Nighttime',
    ...(musicReferences[track.id] ?? { credit: track.artist ?? 'Artist / source still being confirmed.' }),
  }))

export const interfaceCredits = [
  { creator: 'VT323 — Peter Hull', description: 'Pixel typeface by Peter Hull, served through Google Fonts.', href: 'https://fonts.google.com/specimen/VT323', linkLabel: 'VT323 on Google Fonts' },
  { creator: 'Lucide & contributors', description: 'Interface icons, including the music controls.', href: 'https://lucide.dev/license', linkLabel: 'Lucide credits & licenses' },
] as const

export const catSoundCredit = {
  creator: 'freemaster2',
  title: 'Meow of a Siamese cat',
  href: 'https://commons.wikimedia.org/wiki/File:Meow_of_a_Siamese_cat_-_freemaster2.wav',
  license: 'https://creativecommons.org/publicdomain/zero/1.0/',
} as const
