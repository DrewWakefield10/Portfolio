# Faster fish and interactive fan

Fish travel and direction loops run 1.6 times their previous speed: the existing duration divisor changes from 1.4 to 2.24. Normal swim cycles are now about 7.59–13.84 seconds instead of 12.14–22.14 seconds. Individual durations, phase offsets, easing, travel distances, base positions, sizes, artwork, tail-fin/body animation, tank clipping, and foreground occlusion are preserved. Reduced motion retains half-speed, shorter travel relative to the new normal speed.

The artwork contains one electric fan, identified as `shelf-fan`. Its native-button hotspot covers the cage/base and excludes nearby objects; cyan feedback highlights the cage and base control without visible labels or tooltips. It supports mouse, Enter/Space, and touch, stays behind windows, and announces its current/next setting through its accessible name.

Default Low runs at 60 visual RPM. Clicks cycle Low → Medium (120) → High (240) → Off → Low. Off stops only the rotor. The setting is saved under `portfolio-fan-speeds-v1`; invalid, missing, stale, or blocked storage falls back to Low. State is keyed by stable fan ID, with reusable speed/controller helpers for independent instances; no additional fans or artwork are fabricated.

The fan keeps one native CSS animation with a one-second base revolution. `FanRotation` uses `Animation.updatePlaybackRate` to ramp its rate over 450ms with smooth easing, preserving currentTime, rotation angle/direction, and its original center. Retargeting cancels only the previous ramp callback and starts from the current rate. Steady rotation and Off run without a JavaScript frame loop or per-frame React updates. Context restoration applies the saved speed directly; theme changes keep the same rotor animation and settings. Hidden tabs pause all environmental animation and cancel any ramp; returning settles toward the selected speed. Unmounting cancels callbacks and listeners.

Reduced-motion settings preserve gentle continuous fan control: Low/Medium/High use 12/6/3-second revolutions. Fish remain gently active, extra bobbing/fin motion and flashing stay suppressed, and the existing clock keeps local time. A quiet 60–80ms mechanical triangle tick uses the existing single-voice effects system, gesture unlocking, global mute, and activation throttling. No continuous motor audio or music changes were added.

Files changed in this update:

- `components/StoreEnvironment.tsx`: fish speed multiplier and stable controlled rotor.
- `components/StoreHotspots.tsx`, `lib/store-scene.json`, `app/globals.css`: aligned fan hotspot, stable ID, feedback, and fixed-duration native rotor animation.
- `context/FanContext.tsx`, `lib/fan.ts`, `components/useFanRotation.ts`: saved per-ID speed state, pure cycle/validation helpers, and transient playback-rate ramps.
- `components/Home.tsx`: scopes the fan provider around the existing wallpaper and hotspots.
- `lib/ui-sounds.ts`, `context/AudioContext.tsx`: muted/throttled fan-switch feedback.
- `tests/fan.test.cjs`, `tests/ui-sounds.test.cjs`, `tests/browser-smoke.cjs`, `package.json`: controller/preference/audio checks, browser regression checks, and `npm run test:fan`.
- This document and `docs/ANIMATION_AUDIO_NOTES.md`: implementation and verification notes.

Verification:

- Standalone TypeScript and production build passed. The existing parent-lockfile/workspace-root warning remains.
- `npm run test:fan`: 2 tests passed, covering cycle/defaults, per-ID preference validation, normal/reduced rates, smooth ramp retargeting, no timeline writes, cancellation, and no steady-state frame callbacks.
- `npm run test:audio`: all 30 tests passed, including quiet fan activation tones, shared throttling, and prior-voice release.
- `npm run test:time`: all 3 existing calendar/shared-clock tests passed.
- The complete production Chrome suite passed. New checks measure the fan's continuous angle/timeline during each 450ms ramp, distinct rates, stationary Off while fish/clock continue, fixed fan body, Off/High reload persistence, theme continuity, rapid-click parity, keyboard/touch, mute, foreground-window occlusion, reduced-motion rates, invalid preferences, and hotspot alignment in both themes at 1080p/1440p/4K/mobile/landscape. Fish tests verify the 60% speed increase, unchanged fin/body animation, turns, tank containment, and seamless loops. Existing wallpaper objects, clock/date popups, desktop apps, interest clouds, experience navigation, and music regressions passed. No runtime exceptions or missing assets were observed.
- Lint was attempted but remains unavailable because ESLint is not installed/configured in the existing project.
- The development server serves the new fan hotspot/styles and fixed native animation timeline. Browser results/screenshots remain in `.next/verification/`.
