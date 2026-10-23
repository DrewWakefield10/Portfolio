# Tap the aquarium glass

The original six fish, day/night sprites, clean plates, aquarium foreground, decorations and clipping rectangle are unchanged. This adds an independent glass Easter egg to the existing wallpaper.

## Files

- `components/AquariumHotspot.tsx`: transparent native button, tap coordinates and one reusable pixel ripple.
- `components/StoreHotspots.tsx`, `lib/store-scene.json`: hotspot registration and original-scene rectangle.
- `components/useFishReaction.ts`: shared active-only animation driver; browser animation and visibility/media integration.
- `lib/fish-reaction.ts`: independent steering, speed/position bounds, attack/recovery and repeated-tap model.
- `components/StoreEnvironment.tsx`: two lightweight transform groups per fish; original swim, turn, body and tail loops retained.
- `app/globals.css`: faint hover/focus glass edge, 22px pixel ripple and flat fish heading transforms.
- `lib/ui-sounds.ts`, `context/AudioContext.tsx`: soft synthesized water-bubble sequence, existing shared UI FX settings and 200ms sound cooldown.
- `tests/fish-reaction.test.cjs`, `tests/browser-fish.cjs`, `tests/ui-sounds.test.cjs`: model, real-input and audio checks.

No dependencies, image/video assets or external sound recordings were added. The cat work already present in the workspace is preserved. Window.tsx, StoreScene's tap/swipe handling, music, fan behavior and project content are unchanged.

## Hotspot

`scene.interactions.tank`: x=1163, y=434, width=370, height=231 in the existing 1672 × 941 scene. It covers the visible glass beneath the tank rim. The original, narrower swimmer/foreground clip remains x=1177, y=458, width=350, height=203. Both use the shared contain scale and mobile-panning stage. Nearby machines and other hotspots do not overlap the glass.

The native button supports mouse, tap, Enter and Space, with a visible keyboard outline and no labels/tooltips. Pointer input maps to scene coordinates; keyboard activation uses the glass center. Existing scene-level swipe suppression prevents both fish reactions and glass sounds while panning. Hover adds a faint edge; tap adds a short, clipped ripple at the contact point.

## Fish behavior

The original CSS swim/turn/fins keep their animation objects and phases. Idle travel still uses exactly the previous 2.24 tempo; a shared constant now supplies both rendering and steering calculations.

| Stage | Time | Behavior |
| --- | --- | --- |
| Startle | 0–125ms | Individual 0–45ms delays and an 80ms acceleration |
| Escape | 125–550ms | Separate tap-aware vectors, independent peak rates from 100–200× |
| Recovery | 550–1000ms | Smooth deceleration to exactly 1× |
| Calm | After 1000ms | Original loops continue at the recovered locations |

Closer fish react sooner/stronger. Controlled per-fish and per-interaction variation avoids identical reactions. Travel/turn speed can reach 200×, while body/tail loops are capped at 3.5× to keep their tiny motion readable. Wall steering responds faster at these high speeds, avoiding a pause against the boundary. Flat heading compensation turns sprites toward their escape velocity; a short 2D turn rejoins the normal heading during recovery. There are no 3D rotations or tank shaking.

A small outer translation offsets each original swim path. Steering blends the current path velocity with an individual escape vector and projects it into both the permitted position rectangle and a 200× nominal maximum-speed circle. Eight scene-pixel margins reserve the full original path plus fin/body motion. Fish steer back inward at limits. The existing aquarium clip remains a final containment layer, with plants/rocks still in front.

Offsets stay in place when recovery completes, rather than resetting to zero. The existing idle paths therefore resume from new locations, preserving position and phase without teleporting. A single rAF runs only during the reaction; normal idle swimming remains browser-managed. Style reads are batched before writes, animations are cached per interaction, and React does not update every frame.

## Repeated taps, sound and lifecycle

Accepted repeated taps smoothly retarget existing fish inside the same one-second window; they never extend the deadline. Very late taps do not re-accelerate the fish; a 200ms calm interval follows each burst. Fish rates never multiply recursively.

The aquarium now plays a unique, soft water-bubble sound in the existing UI AudioContext: three rising sine "bloop" notes start at 0, 75 and 160ms, each with its own rounded attack/release envelope and pitch. Three variants rotate between clicks. The sequence lasts about 300ms and has a 200ms cooldown; new clicks release the previous voice instead of stacking sequences. Existing gesture unlocking and UI FX mute are respected. No sound files, additional HTML audio element or music stream are created.

The 320ms pixel ripple is localized and reused instead of stacking elements. The user's explicit 100–200× click-burst request applies in both motion preferences; the earlier reduced-motion 1.35× cap was why the effect could still appear slow on this system. Reduced motion retains the existing slower, shorter idle path, a 160ms opacity-only ripple, no fin/body motion, and a steady compensated heading during the burst. Theme changes retain the reaction and all fish animation timelines. Hidden tabs or preference changes cancel the reaction, restore normal rates and keep recovered positions; existing hidden-tab CSS still pauses environmental motion. Cleanup removes listeners, rAF and transient turn animations.

## Verification

- `node --test tests/fish-reaction.test.cjs`: independent timings/vectors/100–200× peaks, tap awareness, smooth recovery, retained offsets, speed/bounds under tap storms, fixed one-second deadline and explicit burst speed under reduced motion.
- `npm run test:audio`: existing player/catalog/SFX tests plus staggered rising bubble notes, envelopes, cooldown and voice cleanup.
- `node tests/browser-fish.cjs`: native desktop input, staggered rates, scattering, gradual recovery, bounds through tap storms, theme continuity, mute, keyboard, visibility cancellation, reduced motion and portrait/landscape mobile taps/swipes/alignment.
- Existing desktop/mobile browser suites and focused cat/zapper suites check the surrounding interactions.
- Lint, TypeScript and production build are required checks.

The original aquarium implementation passed the complete desktop and eight-viewport mobile Chrome suites plus cat/zapper regression checks. The updated one-second burst and bubble sequence are covered by the revised unit and focused browser tests above. Browser results are saved under `.next/verification`; they report the measured rates and recovery time for the current implementation.

The 100–200× update passed the production build, lint, TypeScript, four steering unit tests, and the focused fish browser suite in both themes, portrait/landscape touch emulation, and both motion preferences. Sampled normal-motion peaks were approximately 159–187×. The bubble sound and one-second deadline are unchanged.

Browser coverage uses local Chrome/touch emulation, not physical iOS/Android devices or Safari. Lightweight steering does not simulate fish-to-fish collisions; the artwork's foreground can naturally obscure a swimmer. Idle paths may be translated after a reaction, but their original speed, shape, phase and artwork are preserved. The existing global scrollbar static-audit finding is unrelated and unchanged.
