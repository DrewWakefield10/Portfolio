# Supplied day and night soundtrack

The user replaced the generation workflow with eight existing MP3s in `public/music/day/` and `public/music/night/`. No Runway tool, external music generation or credits are used.

## Active playlists

Each theme now has **four supplied songs**. The owner removed the unidentified original portfolio mix from both playlists on 2026-10-16. Existing valid saved song selections are respected; retired selections fall back to the first supplied song while keeping other preferences. Light mode uses the day folder; dark mode uses the night folder.

| Theme | Song | Duration | Measured LUFS | Playback multiplier |
|---|---|---:|---:|---:|
| Day | Remember Summer Days — Anri | 4:54 | -9.71 | 0.192975 |
| Day | Fairground — Pop Culture | 2:08 | -13.64 | 0.303389 |
| Day | Shibuya Sky — Dust Diggers & Hicks | 2:15 | -13.27 | 0.290737 |
| Day | Without U — Thelma Aoyama feat. 4Minute | 3:13 | -10.58 | 0.213304 |
| Night | Midnight Pretenders | 5:43 | -25.17 | 1 |
| Night | anyways — Fool Parsley | 1:51 | -13.04 | 0.283139 |
| Night | Wasurerarenaino | 3:56 | -15.53 | 0.377138 |
| Night | When You're Ready — ARISU | 2:24 | -12.88 | 0.277971 |

Initial titles came from supplied filenames, which have no usable embedded title/artist tags. Four artists and the actual title of anyways were subsequently verified from source videos supplied by the owner. Sources.txt includes those links, the artists, and Tama's Little Music Shop. See [Credits and sources](CREDITS_SOURCES.md). Original filenames, full song lengths and encoded bytes are preserved.

## Playback level and import

The supplied masters measure from -25.17 to -9.71 LUFS. The importer measures each complete file and exports an optional per-track `gain` into `lib/music-library.json`. Loud recordings are attenuated toward -24 LUFS, near the original's measured -23.8 LUFS. Quiet masters are never boosted. The gain also leaves at least 2 dB of measured peak headroom where attenuation is needed.

This is playback-only gain: no trimming, renaming, re-encoding, dynamic compression or replacement occurs. It cannot undo distortion already present in a source recording. The user's volume slider, music mute and UI-sound settings remain independent and unchanged. The outgoing song keeps its own multiplier throughout fade-out; the incoming song's multiplier applies when its source loads.

The `user-supplied` collection accepts natural song lengths and short tails, including the 5:43 Midnight Pretenders file and its approximately 3.3-second ending tail. It still requires a full successful decode, finite duration/loudness/true peak and rejects silent or overwhelmingly empty files. The former 2-3 minute/-24 LUFS master-export requirements remain for generated briefs, rather than blocking the supplied songs.

Paths are encoded per segment when exported, so spaces, apostrophes and other URL characters load correctly without altering filenames. The legacy `/music.mp3` is no longer part of either playlist. Missing generation plans are not requested.

## Updating the collection

1. Add a real audio file under the appropriate day/night folder.
2. Add its metadata to `public/music/catalog.json`: a unique `id`, readable `title`, optional actual `artist`, `theme` (`light` or `dark`), relative `file`, `status: "ready"`, and `collection: "user-supplied"`.
3. Run `npm run music:sync` to fully decode, measure and export it. Run `npm run music:analyze` for a read-only report of all actual music.
4. Rebuild or refresh the development app. Next/Previous and Shuffle use the expanded playlists.

The former twelve planned songs are archived in `docs/music-generation-catalog.json`; their full text briefs remain in `docs/MUSIC_GENERATION_PROMPTS.md` for reference. They are outside the active catalog and do not require external generation for this soundtrack.

## Changed files

- `public/music/catalog.json` and `lib/music-library.json`: eight ready tracks, theme assignments, readable metadata, encoded paths and measured attenuation.
- `scripts/music-audio.cjs` and `scripts/sync-music.cjs`: supplied-song validation and playback-gain calculation alongside the existing generated-master checks.
- `lib/music.ts` and `lib/music-player.ts`: supplied-song ordering and gain for the loaded source, retaining one audio element, fades, saved preferences and mute. The unidentified original mix was subsequently removed from the playlists.
- Audio/import/browser regression tests and current documentation; generation plans archived without deleting their briefs or any audio assets.

## Verification

All eight supplied MP3s decoded successfully before import. `npm run music:sync` activated all eight. Lint, TypeScript, production build and all 44 audio/time/fan unit tests pass, including fallback from retired original-mix selections. The full production Chrome suite passes, including all eight real supplied files, theme playlists, sequential/shuffled navigation, actual end-of-song advance, gain, preferences and stable playback while dragging windows. There are no runtime exceptions or missing assets. Original and supplied audio SHA-256 hashes are unchanged.
