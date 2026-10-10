# Animated store and audio follow-up

## Viewing and hearing the changes

The running development site is at http://localhost:3000. Refresh the page after updating the source. Startup now shows only the wallpaper and navbar. Click the illustrated PC to open or close Home, and either hanging lamp to switch the shared light/dark theme. The PC and lamp hotspots use subtle glow without visible instructional tooltips; their accessible labels remain. The navbar theme toggle remains available. See [Interactive desktop notes](INTERACTIVE_DESKTOP_NOTES.md) for the current interactions and verification.

Wallpaper animation is permanently enabled during normal use; the old System/On/Off menu and saved motion overrides are no longer used. Reduced-motion preferences keep gentle continuous motion: a 12-second fan rotation and fish travel at half the normal pace over 35% of the normal distance. Extra body/fin motion, transitions, and zapper flicker are disabled; the wall clock remains accurate. Hidden tabs pause environmental motion and clock updates.

The bell and test-sound button have been removed. The compact **UI FX ON/OFF** text control preserves the independent sound-effects preference. Click the PC for ordinary click feedback or a lamp for a quiet switch blip. Hover sounds begin after a browser gesture. Gesture-triggered tones wait for a suspended Web Audio context to resume; disabling sounds cancels any pending tone. No background songs were added in this update.

## Implemented

### Continuous 2D refinement

- Visible wallpaper motion starts as soon as the animation assets are ready, without a click or audio-unlock gesture. Device reduced motion uses gentle continuous fan/fish loops without flashing; obsolete saved On/Off overrides are ignored. Hidden tabs pause every moving layer, including fins and body motion.
- Fish cycles run at 1.4 times their previous rate (approximately 12.1–22.1 seconds instead of 17–31 seconds). Each fish keeps its own duration and starting phase, swims horizontally with slight vertical variation, slows into turns, and flips using flat `scaleX` around its center. The source-facing direction is accounted for, including the fish near the left tank edge.
- Each original cached fish sprite is clipped into overlapping body and tail regions. Small 2D tail rotations and gentle body bobbing add fin movement without repainting the artwork, adding image downloads, or simulating depth. The aquarium clip and original foreground plants/rocks still contain and occlude the fish.
- The nighttime zapper uses 20 unevenly spaced pulses over a seamless 61-second cycle, compared with four pulses in 23 seconds before. Most peaks reach only 0.16 opacity, with four soft peaks at 0.21. The flat blue overlay uses opacity alone; the blurred drop-shadow was removed. Its timeline continues during daytime while the overlay stays hidden, so theme switches preserve its phase.
- Fan, swim, turn, fin, body, and zapper animations remain mounted across theme switches. Clock hands remain flat and synchronized with local time. No new images, dependencies, per-frame JavaScript, or per-frame React updates were introduced.
- Updated files: `components/StoreEnvironment.tsx`, `lib/store-scene.json`, `app/globals.css`, `tests/browser-smoke.cjs`, and this document. Wallpaper architecture, signage, audio, and desktop components are preserved.

- One StoreEnvironment SVG aligns to the exact 1672 × 941 wallpaper viewBox using the same contain scaling as the base image. It renders one continuously spinning fan rotor, six original fish sprites on separate swim paths with fin movement, a working local-time hour/minute clock, and a low-contrast night-only bug-zapper glow.
- Small masked clean-plate repairs remove the original stationary fish, fan blades/grille and clock hands underneath the moving layers. All artwork outside those regions comes from the existing masters. Original signage is untouched. Original static wallpapers and lossless masters are preserved.
- The fan rim, stand, red base and original hub stay fixed. Rotor and grille geometry are reconstructed to match the source palette. The actual fish designs come from the supplied image pixels. Plants and rocks sit above swimmers, and a tank clip prevents any escape from the aquarium.
- Hour/minute hand angles include seconds, use the viewer's local Date, and update via DOM refs once per second. No decorative simulated time or per-frame React state updates are used. A second hand was intentionally omitted to keep the existing appearance.
- One visibility listener stops the clock timer and pauses CSS motion when the document is hidden, then synchronizes the clock immediately on return. Reduced motion slows fan/fish loops and shortens fish travel, disables extra bobbing/fin motion and zapper flicker, and leaves the functional clock accurate.
- Theme changes preserve the mounted animation groups and their timelines. Day/night colors and source sprites crossfade; object coordinates are shared. Animation layers do not receive pointer events and remain below the desktop UI.
- Original wallpaper fallback remains visible until both clean bases and all sprites are loaded. Explicit cached-image readiness checks avoid missing SVG load events during hydration. Failed animation assets retain the original static scene.
- Three hover tones (55–75ms) and three complementary click tones (85–105ms) rotate within the existing Web Audio system. Hover is quieter; existing throttles, old-voice release, independent SFX preference, and browser-gesture unlocking remain. Enabling SFX now unlocks a previously disabled context during the enabling gesture.
- One music stream remains active. Shuffle uses a separate bag per theme so each available track is heard before a new bag, avoiding an immediate repeat at its boundary. Shuffle Previous retraces actual playback history; Next can follow that history forward. History is bounded to 50 selections per theme.
- Existing autoplay restrictions, stored preferences, missing-track handling, sequential advance and 1.6-second fades remain. Shared source files continue at their current position across theme changes, including rapid changes back to the still-loaded source. Next/Previous do not restart a one-song playlist.

## Music and audio inventory

Reused unchanged: public/music.mp3 and public/click.mp3 (legacy click backup). No new music recording was generated because no music-generation tool is connected. UI effects are original oscillator synthesis in lib/ui-sounds.ts; no downloadable SFX files or audio dependencies were added.

Four daytime and four nighttime songs are planned in public/music/catalog.json, with full prompts in docs/MUSIC_GENERATION_PROMPTS.md. Their designated folders exist, but no fake audio files were created. All planned entries are excluded from playable arrays. npm run music:sync checks completed files using FFprobe before exporting lib/music-library.json. The live playlists currently each contain the original mix only. Actual additional musical variety therefore awaits those eight files.

## Continuous-motion correction

The local browser reports `prefers-reduced-motion: reduce`. The previous blanket `animation: none !important` rule stopped the fan and all fish after styles loaded. This rule now uses gentle infinite fan/fish loops, with optional bobbing/fin motion and flashing still disabled. Hidden tabs continue to pause and resume normally; normal-motion speeds and paths are unchanged.

The browser regression suite now starts with the actual host motion preference before emulating any preference, checks seven running infinite fan/fish loops across multiple complete cycles, then confirms actual transforms continue changing at normal playback rate. Reduced-motion reloads receive the same checks so an emulated normal preference cannot mask this failure again.

Changed: `app/globals.css`, `tests/browser-smoke.cjs`, this document, and `docs/INTERACTIVE_DESKTOP_NOTES.md`.

Verification after the correction: standalone TypeScript check, production build, and complete Chrome browser suite passed, including actual-system/reduced/normal motion loops, reduced-motion reloads, hidden-tab resume, themes, desktop interactions, and music. No runtime exceptions or missing assets were observed. The development server also serves the corrected continuous-motion CSS.

## Performance and verification

- 18 optimized animation assets total 712,234 bytes (approximately 696 KiB): two base WebPs plus 16 transparent sprites/occlusion layers. Original fallback images add approximately 517 KiB on initial load. Assets cache normally after loading.
- GPU-friendly transform animations handle the rotor and swimmers; the zapper animates only a small region with low opacity. There is no canvas loop, animation dependency, repeated Audio construction, or React render loop.
- npm run test:audio: all 28 tests passed, covering the existing player cases plus shuffle-cycle fairness/history, removed tracks, shared-song continuity, single-track behavior, tone variations/throttles/disposal, skill and light-switch effects, asynchronous audio unlocking/cancellation, and safe activation of actual supplied audio.
- npm run typecheck: passed independently of Next.js's existing ignoreBuildErrors setting.
- npm run build: passed.
- Chrome smoke checks cover motion before the first gesture, 40% faster fish cycles, actual 2D fin movement, direction flips, tank bounds across sampled complete loops, seamless travel endpoints, local clock angles, hidden-tab pause/resume for all moving layers, reduced motion, unchanged animation identities across themes, irregular zapper pulse frequency/brightness, real music playback/fades without shared-source reloads, paused/muted switching, SFX mute/debounce, all music controls, saved preferences, navigation, window dragging/closing, and alignment at 1080p/1440p/4K/mobile viewports. The interactive desktop update adds closed startup, PC/lamp interactions, hotspot occlusion, and native pixel-volume controls. Reload checks wait for the new document before evaluating its audio state.
- No browser runtime exceptions or missing wallpaper/music/animation requests were observed. Screenshots and browser-results.json are under .next/verification/.
- npm run lint remains unavailable because the existing project does not install/configure ESLint. No lint success is claimed.
- The existing Next.js parent-lockfile/workspace-root warning remains. No unrelated configuration or dependency changes were introduced.

## Files changed in this follow-up

Components and styles:
- components/StoreEnvironment.tsx (new reusable animation component/controller)
- components/Wallpaper.tsx
- components/WallpaperMotionControl.tsx (subsequently removed; see the interactive desktop update)
- components/Home.tsx
- components/AudioPlayer.tsx
- app/globals.css
- context/AudioContext.tsx

Configuration and audio:
- lib/store-scene.json
- lib/wallpapers.ts
- lib/music-rotation.ts
- lib/music-player.ts
- lib/music.ts
- lib/music-library.json
- lib/ui-sounds.ts
- public/music/catalog.json
- public/music/day/.gitkeep
- public/music/night/.gitkeep
- package.json (verification/import commands)

Assets and preparation:
- artwork/store-animation/day-clean-plate.png
- artwork/store-animation/night-clean-plate.png
- public/wallpapers/animation/day-base.webp and night-base.webp
- public/wallpapers/animation/{day,night}-fan-hub.png
- public/wallpapers/animation/{day,night}-goldfish-left.png
- public/wallpapers/animation/{day,night}-goldfish-right.png
- public/wallpapers/animation/{day,night}-small-left.png
- public/wallpapers/animation/{day,night}-small-low.png
- public/wallpapers/animation/{day,night}-small-middle.png
- public/wallpapers/animation/{day,night}-small-right.png
- public/wallpapers/animation/{day,night}-tank-foreground.png
- scripts/prepare-store-animation.cjs
- scripts/sync-music.cjs

Tests and documentation:
- tests/audio.test.cjs
- tests/ui-sounds.test.cjs
- tests/music-catalog.test.cjs
- tests/browser-smoke.cjs
- docs/ANIMATION_AUDIO_NOTES.md
- docs/MUSIC_GENERATION_PROMPTS.md
- docs/STORE_ANIMATION_PROMPTS.md
- docs/UPGRADE_NOTES.md (link to current follow-up)

Pre-existing edits in AboutWindow.tsx and WorksWindow.tsx were preserved.

## Remaining limitations

- Eight real, suitably licensed music exports are still needed; prompts and destinations are ready. Song loudness and loop transitions should be auditioned after import.
- Existing artwork resolution remains 1672 × 941. Display alignment is verified on 4K screens; no native-4K claim is made.
- The source day/night illustrations already have small texture differences. The animation uses shared geometry and exact extracted silhouettes; it does not attempt to regenerate or redesign those differences.
- Small inpainted water/backplate patches and reconstructed fan geometry are visual approximations of previously occluded areas, while the main architecture/text and original moving fish artwork remain intact.
- ESLint still needs installation/configuration for a runnable lint workflow.

