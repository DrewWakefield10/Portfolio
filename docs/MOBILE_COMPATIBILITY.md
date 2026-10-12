# Mobile store exploration and responsive desktop

Implemented on 2026-10-13 in the existing Next.js application. No dependencies, wallpaper assets, music files, playlists, or music gain settings were changed.

## Preserved desktop baseline

The audit recorded the existing 1672 × 941 scene, `object-fit: contain` presentation, percentage-positioned hotspots, 750px application windows, 480px Home launcher, compact time/calendar windows, 70% window glass, and green/blue theme variables. Desktop window bodies retain their existing height limits, title-bar dragging, cloud-body dragging, custom scrollbars, and position restoration. Above 1024px, the new scene container remains the full viewport with no horizontal scrolling. Navigation backgrounds remain transparent.

## Scene and gestures

`StoreScene` contains the existing `Wallpaper`, environmental SVG/calendar layers, tint, and `StoreHotspots`. At widths up to 1024px, its stage width is `max(viewport width, viewport height × 1672 / 941)`. The artwork keeps its aspect ratio and uses the available height; landscape naturally reveals more scenery. A native horizontal scroll container exposes the complete store, with browser-clamped boundaries and contained horizontal overscroll. The navigation and app windows live outside this container.

A ResizeObserver records the normalized center of the scene and reapplies it on size changes. The first view places the PC near the center where the left boundary permits. Opening/closing windows and theme changes do not reset scrolling. Rotation preserves the same center where possible and clamps it when the scene fits the new viewport.

Pointer movement exceeding 8px, or browser pointer cancellation during native scrolling, suppresses hotspot activation. Audio uses the same gesture flag to discard swipe-end clicks. No component state updates on every pan event. A small, noninteractive pixel-arrow cue disappears after exploration or 6.5 seconds and is remembered for the session; there is no permanent instructional text.

Hotspot rectangles still use the original `store-scene.json` coordinates and the same stage scale/translation as the art. Narrow phone/calendar/light targets gain a transparent touch extension into adjacent free space, without moving the visible object coordinates. Keyboard activation and accessible labels remain available.

## Windows and content

- Mobile applications use approximately 94% of the viewport width, constrained by safe-area margins. Home, time/calendar utilities, and clouds retain sensible compact maximum widths.
- Newly opened mobile windows center in the usable area below navigation. Their height and drag bounds follow the visual viewport, including keyboard-related shrinkage, and reserve display cutouts through `env(safe-area-inset-*)` and `viewport-fit=cover`.
- Close buttons have 44px touch targets. Title bars drag with Pointer Events and pointer capture. Mobile cloud descriptions scroll instead of starting a body drag; desktop cloud-body dragging remains available.
- When multiple windows are open, a mobile-only horizontal application switcher brings an existing window forward without remounting it or resetting its content/project selection.
- About uses smaller responsive profile typography, touch-friendly skills/interests, and independent Experience scrolling. In short landscape viewports, the profile scrolls with the details so it cannot consume the entire content area.
- Existing Works project stacking, wrapping technology tags, linked Experience navigation, Contact links/form fields, and live time/calendar components remain shared across devices.
- Custom scrollbar thumbs now accept pointer input, including touch. Content scrolling stays independent from scene panning and window dragging. Focus restoration uses `preventScroll` so closing a window does not move the scene.

## Navigation and audio

The mobile navigation stays in a single compact row with theme, play/pause, previous, next, mute, and a pixel ellipsis. The ellipsis reveals the current track, volume, shuffle, and UI sound settings in a small secondary panel. The normal navigation remains transparent with the previously improved green/cyan icons. This prevents a second control row from covering the wall lights. Desktop controls keep their original arrangement.

The existing single music element, day/night playlists, fades, selected tracks, preferences, and gain remain unchanged. On touch, saved playback waits for a completed trusted tap; a swipe never resumes music. Chrome's trusted touch clicks can themselves be Pointer Events, so deferral applies specifically to `pointerdown`, not to every PointerEvent. Hover/focus sounds are suppressed for touch navigation, while skills can give tap feedback. Effects remain independently muteable. Existing pause handling recovers from interrupted playback through the Play control.

## Performance

Panning uses native scrolling rather than a JavaScript animation loop or React updates per frame. Scene geometry only recalculates when dimensions change. Existing fish/fan animation objects survive panning and theme changes, and existing hidden-tab/reduced-motion behavior remains intact. Unchanged window positions and already-active focus operations avoid redundant context updates.

The original 1672px-wide WebP scene assets and small PNG animation sprites are reused; no 4K replacements, video layers, filters, or animation libraries were added. The two clean WebPs are about 283/291 KiB, and the two fallback WebPs are about 252/255 KiB. Existing cached readiness checks and audio metadata preloading remain intact; initial loading does not preload the whole music library.

Chrome's `Performance.getMetrics` counters for a two-swipe sample are recorded under `panningMetrics` in the mobile report. They include test assertions and run on this desktop host; they are not real-phone frame-rate or battery measurements.

## Verification

Run the production preview at `http://localhost:3100` (or pass another URL to the test script):

```powershell
npm run build
npm run start -- --port 3100
# In a second terminal:
npm run test:browser
npm run test:mobile
npm run test:firefox
```

The Chrome/Edge tests use isolated headless profiles and native dispatched touch input. Firefox uses a separate isolated headless profile and its native [WebDriver BiDi connection](https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection), including pointer clicks and a horizontal wheel gesture. No browser automation package was installed. `CHROME_PATH`, `FIREFOX_PATH`, and `TEST_OUTPUT_DIR` allow local browser/output overrides.

Tested viewport sizes in both themes:

| Phones | Tablets | Desktop |
| --- | --- | --- |
| 320 × 568 | 768 × 1024 | 1366 × 768 |
| 375 × 667 | 1024 × 768 | 1920 × 1080 |
| 390 × 844 | | |
| 430 × 932 | | |

Chrome and Edge touch suites passed native panning in both directions; scene boundaries; every hotspot; exact artwork alignment after scrolling; theme/rotation continuity; window bounds; simulated safe areas and visual-viewport keyboard shrinkage; silent skill scrolling; independent Experience scrolling; cloud shape/close behavior; title-only mobile dragging; project selection/application switching; audio controls/preferences/interruption recovery; one music stream; and retained animation timelines. No runtime exceptions or missing wallpaper/music assets occurred.

The complete existing Chrome browser regression suite also passed, including desktop dragging, cloud-body dragging, 1080p/1440p/4K layouts, PC/lights/fans, live local clock/calendar boundaries, continuous and reduced motion, hidden-tab resume, all eight supplied MP3s, sequential/shuffle navigation, fades, and stored preferences. All 43 audio/time/fan unit tests, ESLint, standalone TypeScript, and production build passed.

Firefox's separate suite passed all eight viewport sizes in both themes, native pointer activation of the PC/phone/clock/calendar/board, fitted application windows, native horizontal wheel panning, preserved scene position across theme switching after scrolling settles, actual music playback/pause, one playback instance, and absence of browser runtime errors.

Reports and screenshots are generated under `.next/verification/`: `browser-results.json`, `mobile-results.json`, the Edge subdirectory, and the Firefox subdirectory. Generated reports are not committed source files.

## Remaining manual checks

Chrome/Edge touch input is browser emulation, not testing on Android or iPhone hardware. Firefox checks cover desktop Firefox with responsive viewport sizes and native pointer/wheel input. iOS Safari, actual on-screen keyboards, display cutouts, audio route interruptions, and physical-device battery/frame-rate behavior still need real-device checks. Lighthouse CLI is not installed, so no Lighthouse score is claimed. The existing Next.js parent-directory lockfile warning is unrelated to this update.

## Modified files

- `components/StoreScene.tsx` (new): shared pannable scene and gesture distinction.
- `components/MobileWindowSwitcher.tsx` (new): focus existing mobile apps.
- `components/Home.tsx`, `components/StoreHotspots.tsx`: shared scene integration and mobile placement.
- `components/Window.tsx`, `context/WindowContext.tsx`: mobile bounds, centering, safe areas, focus, and redundant-update avoidance.
- `components/RetroScrollArea.tsx`, `components/windows/AboutWindow.tsx`: touch scrollbars and responsive About styling.
- `components/AudioPlayer.tsx`, `context/AudioContext.tsx`: compact mobile options and tap-aware audio.
- `app/globals.css`, `app/layout.tsx`: scoped mobile styles and safe-area viewport configuration.
- `tests/browser-smoke.cjs`: retained desktop checks, shared browser setup, and updated pannable-scene expectations.
- `tests/browser-mobile.cjs`, `tests/browser-firefox.cjs` (new), `package.json`: repeatable browser verification commands.
- `docs/MOBILE_COMPATIBILITY.md`, `docs/TOOLING.md`, `docs/ANIMATION_AUDIO_NOTES.md`: implementation, verification, and limitations.
