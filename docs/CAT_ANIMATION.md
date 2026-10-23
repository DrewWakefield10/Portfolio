# Interactive wallpaper cat

The existing cat is an additional transparent scene hotspot. It supports click, tap, Enter and Space, and follows the existing 1672 × 941 coordinate system during native mobile panning. Swipes use the existing suppression in StoreScene; window dragging is unchanged.

## Artwork

- Original artwork remains credited to Pixel Jeff in Sources.txt.
- `public/wallpapers/animation/cat/day-meow.png` and `night-meow.png`: six 252 × 83 cells, 1512 × 83 overall. Twelve individual PNG frames, a shared transparent silhouette `mask.png`, and `motion-mask.png` are also supplied.
- `node scripts/prepare-cat-sprites.cjs` deterministically rebuilds the production assets from the original day/night masters. These are actual distinct mouth/ear drawings, with hard step transitions; no video, image scaling, bouncing or interpolated drawings.
- All opaque body/fur pixels outside the mouth/ear edits are copied from the corresponding original master. First/last poses are identical. A small source-palette cheek patch covers the original licking mouth before each open-mouth drawing. All poses share one silhouette, so the underlying stationary cat is covered exactly without a new clean plate or duplicate outline.
- The existing wallpaper is untouched and remains the exact idle view. Only the changing mouth/ear regions are composited over it during a meow, with the same scene tint. The body remains the existing wallpaper even at fractional browser scaling, avoiding any sharpness shift. Theme changes swap the sheet without restarting its animation.
- Reduced motion omits the tiny ear change and keeps the stationary mouth drawings, with no head/body/tail movement or flashing. Hidden tabs cancel the interaction, release audio and restore idle.

## Timing and sound

| Frame | Begins | Drawing |
| --- | --- | --- |
| 0 | 0 ms | Original idle |
| 1 | 120 ms | Tiny inner-ear twitch |
| 2 | 280 ms | Mouth opens; sound starts |
| 3 | 500 ms | Full meow |
| 4 | 1060 ms | Closing mouth |
| 5 | 1420 ms | Exact original idle |

Total: **1540 ms**. One Web Animation changes the sheet position with per-keyframe `steps(1, end)`. Only state-boundary timers update data attributes; there are no per-frame React updates. Busy clicks are ignored, including while first-use audio decodes. Neither the wallpaper nor its fish/fan timelines are remounted.

The **1.12-second natural recording** is by freemaster2, available under CC0. Full source links, processing recipe and license are in `public/sounds/CREDITS.md` and Sources.txt. The 9.5 KB MP3 preloads as bytes, decodes once after a browser gesture, and uses a buffer source in the existing shared UI AudioContext. It creates no extra HTML audio element and leaves music playback/preferences untouched. The source is scheduled at +280 ms on the same clock as sprite playback. UI FX OFF cancels both pending and active meows; additional meows never overlap. Hidden/unmounted components cancel timers, animations and audio. Sprite failures preserve the original static cat. If sound preparation takes more than 180 ms, the animation proceeds silently, so a failed/slow audio request never holds up the response; later clicks can use a successfully decoded buffer. Failed sound fetches are bounded at eight seconds.

## Asset creation provenance

Built-in image generation was used for the six-pose study saved as `docs/cat-art/meow-pose-reference.png`; the exact prompt is in `docs/cat-art/PROMPT.md`. Production sprites preserve the original source pixels and use the study's opening/full/closing-mouth progression; generated bodies are not substituted for the original cat.

Prompt: “Create six aligned transparent pixel-art frames based on the exact supplied original cat, with identical body, proportions, fur markings and position. Change only a subtle ear detail and mouth: idle, anticipation, opening mouth, full cute meow with tongue, closing mouth, exact idle. No furniture, labels, scaling, body movement, smooth illustration or redesigned character.” Reference: a crop of the original nighttime wallpaper.

## Verification

Implementation files: `components/CatHotspot.tsx`, `components/StoreHotspots.tsx`, `lib/cat-animation.ts`, `lib/store-scene.json`, `app/globals.css`, `context/AudioContext.tsx`, and `lib/ui-sounds.ts`. Recording credits are in `lib/credits.ts`, `components/windows/SourcesWindow.tsx`, and `public/sounds/CREDITS.md`. The sprite build script and asset directories are listed above. Unit/browser checks are in `tests/cat-animation.test.cjs`, `tests/ui-sounds.test.cjs`, and `tests/browser-cat.cjs`; the existing desktop smoke test now asserts the actual three-project Works.app list from the preceding portfolio update.

`node --test tests/cat-animation.test.cjs tests/ui-sounds.test.cjs` verifies six stepped frames, sound timing, original-pixel preservation, exact idle restoration, shared context, muted scheduled-source cancellation, no overlapping meows and unavailable sound recovery.

`node tests/browser-cat.cjs` exercises real mouse/keyboard/touch input, day/night, rapid clicks, mobile scene panning/alignment, reduced motion, visibility cancellation, UI FX mute and retained wallpaper animation timelines against the production preview at http://localhost:3100. Also run lint, typecheck, existing audio/time/fan tests and the production build.

Verified on 2026-10-24: production build, lint and TypeScript; 49 unit tests (42 audio/catalog/SFX, two cat assets/timing, three local-time and two fan); complete desktop and eight-viewport mobile Chrome regressions; focused cat and zapper browser suites. Additional blocked-request checks confirmed silent animation without the MP3, preservation of the original cat without its sprite, and continued zapper sound after a failed meow fetch. FFmpeg measured the processed recording at -5.5 dB maximum before its 0.25 playback gain, with no output clipping. Day/night idle and meow browser crops were visually inspected.

Limits: head, body and tail remain fixed to preserve original pixels and avoid new background reconstruction. Only the mouth and a tiny ear detail change. Device coverage uses Chrome emulation, not physical iOS/Android hardware or Safari. The user's OS/browser may require a first sound-unlock gesture; a denied audio context leaves the animation silent. The broader static UI audit still reports the pre-existing WebKit-only global scrollbar theme in `app/globals.css`; this unrelated style is unchanged.
