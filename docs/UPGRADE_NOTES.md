# Portfolio wallpaper and audio upgrade

For the subsequent animated scenery, shuffle-bag rotation, expanded UI tones, and music preparation, see [ANIMATION_AUDIO_NOTES.md](ANIMATION_AUDIO_NOTES.md). The notes below describe the initial static-wallpaper upgrade.

Implemented in the existing Next.js portfolio. The Home layout, draggable window implementation, icons, typography, transparency, and About/Works content are preserved. Pre-existing user edits in AboutWindow.tsx and WorksWindow.tsx were not touched.

## Wallpaper deliverables

- public/wallpapers/store-day.webp — native 1672 × 941, 262,844 bytes.
- public/wallpapers/store-night.webp — native 1672 × 941, 266,236 bytes.
- public/wallpapers/store-day-master.png and store-night-master.png — lossless masters.
- docs/wallpaper-signage.svg — shared, deterministic lettering.
- docs/wallpaper-comparison.webp — side-by-side view of both native masters.

The built-in image generation tool recreated the daytime shop interior from the original JPEG. The completed daytime master, including corrected lettering, was the reference for the nighttime lighting edit. The available generator returned 1672 × 941 despite the initial 4K request. These files have not been enlarged or passed off as native 4K.

The original 1024 × 734 JPEGs remain unchanged at public/background light.jpg and public/background dark.jpg. The recreation preserves the central shop arrangement and extends the scene to a nearly 16:9 canvas to fit desktop displays. Generative rendering introduces small texture/detail variations, including the view through the far-left glass; absolute pixel-for-pixel identity outside the deterministic signage is not guaranteed. Main fixtures and framing were compared visually.

Readable text retained: 訪客請先登記, 23, 星期五, 7., and clock numerals. The user supplied "Drew portfolio" in Japanese for the two unclear signs; those signs now read ドリューのポートフォリオ in four lines. The same SVG coordinates, lettering, and fonts are composited into both PNG masters, with only paint/lighting colors changing at night. Small decorative/unreadable marks elsewhere were not given invented replacement wording.

Wallpaper.tsx keeps both theme images mounted, fades their opacity over 600ms, waits for the target image to load, and respects reduced motion. Images use object-fit: contain to preserve the full scene without stretching; nonmatching viewport ratios show background-color margins. Rendering on a 4K screen does not make these native 4K assets.

To process another generation, run:
```sh
node scripts/prepare-wallpapers.cjs <day-source.png> <night-source.png>
```
The helper uses the project's existing transitive sharp package and the installed MS Gothic/Yu Gothic CJK fonts (equivalent fonts are needed when rebuilding elsewhere), applies the shared text, and exports WebP at quality 94. It refuses unexpected dimensions rather than silently resizing artwork. For externally produced native 3840 × 2160 replacements, update the overlay viewBox/coordinates and dimension validation, regenerate assets, and update lib/wallpapers.ts if the filenames change.

## Audio assets and behavior

Reused: public/music.mp3 (118.13 seconds; no embedded title/artist metadata). The original public/click.mp3 remains as a backup but is no longer used for interactions. No external or newly downloaded music files were introduced.

New UI sounds are synthesized in lib/ui-sounds.ts using Web Audio sine tones: a 65ms hover envelope and a 95ms click envelope, with soft attack/release, quieter hover gain, cooldowns, and release of the previous voice. No sound-file references or licensing dependencies are required. A single AudioContext is unlocked by a browser gesture and disposed on cleanup. Central event delegation covers enabled buttons, links, window actions, theme/music controls, and keyboard focus. Descendant movement inside the same control does not retrigger hover. The bell control independently enables/disables UI sounds.

lib/music.ts contains separate light and dark metadata arrays. Both deliberately use the original mix because it is the only supplied track; they do not yet have different musical content. To expand them, place licensed songs under public/music/ and add real { id, title, artist?, src, theme } entries to the appropriate array. IDs must be unique within each playlist.

MusicPlayer maintains exactly one HTMLAudioElement. Play/pause, next/previous, sequential advance, nonrepeating shuffle when multiple tracks exist, mute/unmute, volume, and track title are supported. Theme switching fades down for 800ms, switches the source, then fades up for 800ms. This is a serial fade transition to avoid simultaneous streams. MUSIC_TRANSITION_MS configures the duration. Volume changes ramp over 100ms; output gain is capped at 0.18, with default effective gain 0.09.

Paused, muted, zero-volume, or browser-blocked music does not begin playing as a result of a theme change. Rapid skips/themes and pause actions invalidate older fades/play promises. An unavailable track is skipped while playing; failures are bounded by available source URLs and expose a retry message when exhausted.

localStorage key portfolio-audio-v1 preserves enabled intent, volume, mute, shuffle, UI sounds, and last selected track for each theme. Stored playback intent waits for a user gesture on reload. Autoplay denial is recoverable with Play. Blocked/malformed storage is handled safely. Theme preference validation and blocked-storage handling were also added.

## Verification

- npm run test:audio: 14 regression tests passed, including transitions, cancellation, autoplay denial, broken-track exhaustion, stored selections, mute, volume, sequential/shuffle logic, and cleanup.
- npm run typecheck: passed independently of the existing Next.js ignoreBuildErrors setting.
- npm run build: passed. Existing warning: a parent-directory pnpm-lock.yaml causes Next.js to infer the workspace root above this project. That configuration was not changed.
- npm run test:browser: passed against the production server with real headless Chrome playback, pointer feedback, music controls, theme changes, persistence/reload, window dragging/closing, and 1920 × 1080, 2560 × 1440, 3840 × 2160, and 375 × 812 viewports.
- Browser run observed one music element, no runtime exceptions, and no missing music/wallpaper requests. Screenshots and browser-results.json are under .next/verification/.
- npm run lint: cannot execute because ESLint is absent from the existing dependencies and there is no ESLint configuration. No lint success is claimed.
- No dependencies were added.

To rerun browser checks, start npm run start -- --port 3100 after building, then run npm run test:browser. The test uses installed Chrome by default, supports CHROME_PATH, launches a hidden isolated profile, and never changes the user's browser profile. A different server URL can be passed as the script's first argument.

## Changed files

Existing files modified:
- app/globals.css
- app/layout.tsx
- components/AudioPlayer.tsx
- components/DesktopIcon.tsx
- components/Home.tsx
- components/ThemeToggle.tsx
- context/ThemeContext.tsx
- package.json (verification scripts only)

Added:
- components/Wallpaper.tsx
- context/AudioContext.tsx
- lib/music.ts
- lib/music-player.ts
- lib/ui-sounds.ts
- lib/wallpapers.ts
- scripts/prepare-wallpapers.cjs
- tests/audio.test.cjs
- tests/browser-smoke.cjs
- docs/UPGRADE_NOTES.md
- docs/image-generation-prompts.md
- docs/wallpaper-signage.svg
- docs/wallpaper-comparison.webp
- public/wallpapers/store-day.webp
- public/wallpapers/store-night.webp
- public/wallpapers/store-day-master.png
- public/wallpapers/store-night-master.png

## Outstanding assets

- Additional licensed daytime and nighttime music tracks, with titles/artists if known.
- Externally generated native 4K master artwork if true 3840 × 2160 output is required; exact structural identity beyond the shared lettering should be reviewed in those masters.
- ESLint plus a project configuration if a runnable lint workflow is desired.
