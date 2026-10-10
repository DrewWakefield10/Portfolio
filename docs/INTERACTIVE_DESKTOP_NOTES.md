# Interactive desktop update

Startup renders the live wallpaper, environmental animation, and compact navbar. All windows, including Home, start closed on both the server and client. Copyright text lives inside Home so startup has no separate footer.

## Computer and lamps

The monitor on the left counter is the entry point. Clicking it opens Home when closed and closes Home whenever open, including behind another app. The shared window context performs toggles against the latest state, so rapid or batched clicks preserve parity and never duplicate a window. Home is draggable, shares desktop stacking, remembers its position, and has a close button. Closing it returns keyboard focus to the PC. About, Works, Contact, and interest clouds retain their own state.

Transparent native buttons align with the monitor and both hanging lamps using coordinates in `lib/store-scene.json`. A centered map uses the same 1672 × 941 contain scaling as the wallpaper and animation SVG, including mobile letterboxing. PC and lamp hotspots render no visible text or native tooltips. Their screen-reader names still describe the action, and the PC name changes with Home state. Hover and keyboard focus softly illuminate the screen or fixture; activation adds a local 450ms pixel pulse. Reduced motion disables the pulse.

Either lamp toggles the existing ThemeContext immediately. Navbar icons, wallpaper, app colors, and saved theme preferences follow that single state. Both day/night artwork layers and animation timelines remain mounted. The lamps use a quiet 70–90ms synthesized switch sound through the existing effects preference, throttling, and single released voice. PC clicks retain ordinary click feedback. No raster assets or dependencies were added.

Native buttons support keyboard and touch. Hotspots remain behind app windows and controls. The desktop layout and empty navbar space allow pointer events to reach the artwork, while actual windows and navbar controls receive their own interactions.

## Wallpaper and navbar

The old motion control component, its handlers, motion prop, and optional On/Off styling were removed. Animation runs automatically whenever the assets are ready and the document is visible. Device reduced motion now uses slower continuous fan/fish loops with shorter fish travel, while disabling extra bobbing/fin motion and zapper flicker; the functional clock remains accurate. See the continuous-motion correction in `ANIMATION_AUDIO_NOTES.md`. Old stored wallpaper-motion choices no longer override this behavior.

The theme toggle, play/pause, previous/next, music mute, shuffle, and volume remain. The bell icon and test-sound button were removed. A compact UI FX ON/OFF text toggle keeps effects independently mutable. Pause now uses sharp pixel-grid SVG bars. The native volume range uses segmented fill and a square thumb, retaining mouse, touch, keyboard, mute, and stored-volume behavior. Light mode follows plant green and dark mode follows cyan/navy.

## Modified files

- `components/StoreHotspots.tsx` (new): shared computer/lamp hotspot map, accessible buttons, local illumination pulses, context actions.
- `lib/store-scene.json`: monitor, screen, and lamp coordinates alongside the existing animation geometry.
- `components/Home.tsx`: closed-by-default Home via the existing Window component, hotspot mounting, compact navbar, copyright inside Home.
- `components/Window.tsx`: launcher size and keyboard focus/Escape behavior, retaining app/cloud dragging.
- `context/WindowContext.tsx`: atomic open/close toggling and centered initial Home placement.
- `context/ThemeContext.tsx`: functional theme toggles for consecutive interactions.
- `components/Wallpaper.tsx` and `components/StoreEnvironment.tsx`: remove obsolete motion settings and retain continuously mounted layers.
- `components/WallpaperMotionControl.tsx` (removed): obsolete menu, stored overrides, and handlers.
- `components/AudioPlayer.tsx`: pixel pause, segmented volume, text effects toggle; remove bell and test-sound controls.
- `context/AudioContext.tsx`: remove preview-only API and route lamp activations through existing audio delegation.
- `lib/ui-sounds.ts`: quiet light-switch variants with shared activation throttling and voice release.
- `app/globals.css`: hotspot alignment/feedback, pointer routing, responsive Home sizing, permanent motion accessibility, pixel slider.
- `tests/ui-sounds.test.cjs`: light-switch waveform, gain, duration, and throttling coverage.
- `tests/browser-smoke.cjs`: startup, computer toggle and isolation, rapid clicks, keyboard/touch, lamps/theme persistence, hotspot alignment/occlusion, native range input, removed controls, and existing desktop/audio/animation regression checks.
- `docs/ANIMATION_AUDIO_NOTES.md`, `docs/ABOUT_INTERACTIONS_NOTES.md`, and this file: current controls, behavior, and verification.

## Final wallpaper refinement

Removed the `OPEN HOME`, `CLOSE HOME`, and `FLIP SWITCH` tooltip markup and its unused CSS. Glow, activation pulses, pointer cursors, accessible names, keyboard activation, toggle handlers, and audio remain intact.

The existing live-only lifecycle already satisfies the final brief: no manual motion control, static selection, motion preference state, or runtime motion storage remains. Both themes retain the same animation instances; hidden tabs and reduced-motion accessibility remain supported. Original artwork appears only while assets load or if an animation asset fails, not as a selectable mode. Music controls remain independent.

Files modified for this refinement:
- `components/StoreHotspots.tsx`: remove the visible tooltip spans.
- `app/globals.css`: remove unused tooltip rules, retaining hotspot feedback.
- `tests/browser-smoke.cjs`: verify absent labels/native tooltips, accessible names, PC/lamp hover glow and cursors, and advancing animation instances across window interactions. Existing checks cover ignored old motion preferences, themes, clock, fish, zapper, hidden tabs, reduced motion, desktop apps, and audio.
- `docs/ANIMATION_AUDIO_NOTES.md` and this file: document current behavior and verification.

Final refinement verification: standalone TypeScript check, production build, and the complete Chrome browser suite passed. Browser checks confirmed advancing animation timelines across PC/window actions, label-free hover feedback, and all existing theme, desktop, music, and accessibility behaviors, with no runtime exceptions or missing assets. The running development page also serves the updated label-free markup and styles. Lint was attempted but remains unavailable because ESLint is not installed.

## Verification

- Standalone TypeScript check passed.
- Production build passed, retaining the existing multiple-lockfile root warning.
- All 28 audio tests passed.
- ESLint remains unavailable because the repository's lint script references an uninstalled/unconfigured executable.
- The complete production browser suite passed on port 3100, including 1080p, 1440p, 4K, portrait mobile, and short landscape; mouse, touch and keyboard interactions; saved themes/audio; reduced motion and hidden tabs; existing app/cloud/project behaviors; and wallpaper/music continuity. No runtime exceptions or missing audio/wallpaper requests were observed. Results and screenshots are written to `.next/verification/`.
