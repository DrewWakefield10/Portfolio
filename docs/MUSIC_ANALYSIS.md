# Existing soundtrack analysis and expansion status

Current soundtrack: eight supplied MP3s are active as four day/four night songs. The unidentified original mix was removed from both playlists on 2026-10-16. External generation was cancelled. See [SUPPLIED_MUSIC.md](SUPPLIED_MUSIC.md) for the current files, measured levels, playback gain and verification. The analysis below records the earlier original-only reference and generation plan; its former empty-library/pending-generation statements are historical.

Analysis date: 2026-10-12. All actual music assets and the active playlists were inspected before planning the expansion. No new songs have been generated.

## Asset inventory and measured reference

| Asset | Role | Result |
|---|---|---|
| `public/music.mp3` | Original background mix | Only actual music file; shared by light and dark playlists |
| `public/music/day/` and `public/music/night/` | Additional songs | No audio files present |
| `public/music/catalog.json` | Production plan | Twelve new planned songs; no missing file is activated |
| `lib/music-library.json` | Verified additional playlist metadata | Empty |
| `public/click.mp3` | Existing UI effect, not a soundtrack song | 1.097 seconds, MP3, stereo, 44.1 kHz; preserved |

The previous eight planned songs were not recordings. Their original descriptions are retained in `docs/music-catalog-previous.json` as an archive, which the player and importer never read.

Measured `public/music.mp3` with FFprobe and a complete FFmpeg decode:

| Measurement | Value |
|---|---:|
| Container duration | 118.125714 seconds (1:58.13) |
| Decoded signal duration | Approximately 118.097 seconds |
| File size | 1,549,661 bytes |
| Codec / channels / sample rate | MP3 / stereo / 44,100 Hz |
| Average encoded bitrate | Approximately 104.95 kbps |
| Integrated loudness | -23.80 LUFS |
| True peak | -8.81 dBTP |
| EBU loudness range | 9.20 LU |
| Silence below -60 dBFS lasting at least 1 second | One approximately 1.846-second ending tail |
| SHA-256 | `45dd834f94decfa4f1f56aac7c0e0eb97f4a37f537bc6efceac504bc63759b86` |

The true peak is safely below clipping. The loudness range indicates meaningful level variation, not a continuously limited master; LRA is not the same as peak-to-RMS dynamic range. A full decode completed without an FFmpeg error. This does not establish the absence of audible artifacts.

## Musical characteristics and uncertainty

There is no listening/transcription model connected. These are signal measurements and production inferences, not an audition or a transcription.

- **Tempo:** a positive log-spectral-flux onset envelope produces strong autocorrelation candidates around **99.4 BPM** and **67.1 BPM** over the whole track and each of three 30-second windows (15-45s, 45-75s, 75-105s). Whole-track normalized correlations are approximately 0.735 and 0.678, respectively. The relationship may reflect rhythmic subdivisions or repeating texture; neither is a confirmed beat tempo. With one ambiguous reference there is no defensible exact average BPM. Planned tracks use 66-86 BPM, within the requested gentle day/night ranges and compatible with the slower candidate.
- **Timbre:** mono 22.05 kHz STFT analysis (2048-sample window, 256-sample hop) gives an energy-weighted spectral centroid of approximately **743 Hz**. Approximately 21.68% of measured energy is below 200 Hz, 75.75% between 200 Hz and 2 kHz, and 2.56% between 2 and 8 kHz; very little lies above 8 kHz. This supports a restrained, midrange-weighted production direction with subdued treble. It does not identify a piano, guitar, tape effect, or acoustic instrument.
- **Bass:** appreciable low-frequency energy is present, but bass instrument, pitches and playing style cannot be identified from this aggregate spectrum.
- **Drums and rhythmic complexity:** recurring onset structure is measurable. Drum type, swing amount, meter and rhythmic density are unverified; autocorrelation alone cannot distinguish percussion from repeated pitched notes.
- **Harmony and chord progressions:** not reliably established. The keys, seventh/ninth voicings and progressions in the new briefs are proposed original composition directions, not chords detected in the reference.
- **Genre and influences:** no reliable genre classification is available. Lo-fi, R&B, neo-soul, jazzhop and ambient electronic come from the requested creative direction; the spectrum and quiet master support using soft production across them.
- **Energy and atmosphere:** the low integrated level, rounded spectrum and lack of excessive peak level support a restrained background mix. Cozy, nostalgic and dreamy moods are creative goals rather than machine-verified emotions.
- **Day versus night:** both existing theme entries point to the exact same `/music.mp3` source. There is no existing musical difference to analyze. The new briefs introduce a warm day palette (six songs, 68-86 BPM) and spacious night palette (six songs, 64-76 BPM) without claiming those differences already exist.

## Production decisions

Twelve original instrumental briefs: 5 lo-fi (41.7%), 4 R&B / neo-soul (33.3%), 2 jazzhop (16.7%), 1 ambient electronic (8.3%). Six day and six night, each 144-168 seconds. Shared soft keys, rounded bass, restrained transients and short natural tails should connect the genres. Every song has its own proposed key, harmonic loop, melody direction, rhythmic treatment and section plan.

New encoded masters target **-24 LUFS (+/-1.5 LU)**, close to the existing -23.8 LUFS, with true peaks no higher than **-2 dBTP**. The previous -20 LUFS suggestion was about 3.8 LU louder than the actual reference and has been superseded for this expansion. A 5-10 LU LRA is a creative guideline only; the importer does not force a dynamic-range number. Human audition at unchanged player volume is still needed.

The existing music and click effect remain byte-for-byte unchanged. No audio is copied into multiple song names, re-encoded, normalized, or replaced. No planned song is included in active playback.

## Available tools and reproduction

FFmpeg/FFprobe can decode, measure, normalize and encode audio; they do not generate finished musical compositions. Python with NumPy/SciPy is available for optional numerical rhythm/spectrum analysis. Torch alone is not a connected music-production model; no music model weights or production library are installed for this task.

A plugin search found Runway advertising music generation, but it is not connected. A connection suggestion was provided. No external generation, credit use, or upload occurred. All twelve songs still require actual external generation and audition.

- `npm run music:analyze`: inventories the original and all actual music under `public/music/`, fully decodes each file and prints hashes, duration, loudness, true peak, LRA and silence. It is read-only and includes unready audio so it can be measured before promotion.
- `python scripts/analyze-music-rhythm.py public/music.mp3`: optional numerical tempo/spectrum report, requiring the already available NumPy and SciPy. Its candidates must not be treated as confirmed musical transcription.
- `npm run music:sync`: promotes explicitly-ready real files after full decoding and quality checks, writing only browser metadata. Planned entries are skipped without probing nonexistent files. No browser audio-generation or analysis dependency is added.
- [MUSIC_GENERATION_PROMPTS.md](MUSIC_GENERATION_PROMPTS.md): complete prompts, metadata, intended file paths and mastering/import steps for every pending song.

## Playback and verification scope

The runtime player, theme switching and audio preferences are unchanged. It retains one music media element, metadata-only preload, per-theme shuffle bags, playback history, automatic advance, saved settings, autoplay handling and 1.6-second fades. Shared original audio continues across theme changes without restarting. Existing multi-track unit fixtures exercise next/previous, sequential and shuffle rotation, no immediate repetition, auto-advance, fade cancellation, failed-file recovery and muted/paused theme changes, even while the live library contains one source.

The importer rejects missing/escaping paths, duplicate IDs/sources, undecodable or silent files, levels outside the reference range, peaks above the ceiling and silence runs over three seconds. Expansion songs must be 120-180 seconds. A successful import cannot prove originality, correct instruments, lack of vocals or a pleasant loop boundary; those checks require the real files and an audition.

No final twelve-song listening comparison is possible yet. No new audio normalization or generated-file playback test is claimed.

## Completed checks for this update

- `npm run music:analyze` passed: the original fully decodes and measures -23.8 LUFS, -8.81 dBTP, 9.2 LU LRA. Original music and click-effect SHA-256 hashes are unchanged.
- `npm run music:sync` passed: zero additional songs activated; all twelve plans remain excluded. The verified library remains empty.
- `npm run test:audio` passed all 35 tests, including real-file import, corrupt/silent/loud-file rejection, peak/silence limits, preservation of the previous library on failure, genre balance and playlist behavior.
- `npm run test:time` and `npm run test:fan` passed five more tests: **40 unit tests total**, none skipped.
- `npm run typecheck` and `npm run build` passed. The existing multiple-lockfile workspace warning remains.
- `npm run test:browser` passed the full Chrome suite: real playback, theme fades, one music stream, pause/mute/volume/shuffle/next/previous, saved preferences, autoplay handling, window dragging/navigation, wallpaper continuity and responsive layouts. No runtime exceptions or missing assets occurred. Results are in `.next/verification/browser-results.json`.
- Follow-up dependency setup: `npm run lint` now passes with zero warnings after installing/configuring ESLint and its matching Next.js/TypeScript rules. See [TOOLING.md](TOOLING.md) for versions, editor integration and the external music connection status.
- `git diff --check` passed.

## Files changed for the music expansion

- Production plan and notes: `public/music/catalog.json`, `docs/MUSIC_GENERATION_PROMPTS.md`, `docs/MUSIC_ANALYSIS.md`, `docs/music-catalog-previous.json`, and the music paragraphs in `docs/ANIMATION_AUDIO_NOTES.md`.
- Read-only measurements and import: `scripts/music-audio.cjs`, `scripts/analyze-music.cjs`, optional `scripts/analyze-music-rhythm.py`, `scripts/sync-music.cjs`, and the `music:analyze` command in `package.json`.
- Regression coverage: `tests/music-catalog.test.cjs` and the planned-track count in `tests/audio.test.cjs`.

Other existing desktop, wallpaper, fan, clock and UI-audio edits were preserved. No runtime music-player change, new browser dependency, generated song, or active-playlist change was necessary for this fallback.
