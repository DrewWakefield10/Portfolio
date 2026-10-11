# Phone, clock, calendar, and bulletin board

The wall phone toggles the existing Contact window, and the bulletin board toggles the existing Works window without discarding its selected project. The clock toggles TIME.EXE; the hanging tear-off calendar toggles CALENDAR.DAT. Both information windows may stay open simultaneously and never open Contact or Works.

All four objects reuse the PC/lamp coordinate map and native buttons. Bounds were inspected against both original 1672 × 941 wallpapers. The clock's stepped hit area follows its case, and the board excludes the blender covering its lower-left corner. Pointer and keyboard focus show subtle cyan/warm highlights without text labels or native tooltips. Quiet phone, clock-tick, and paper-like synthesized hover sounds share existing gesture unlocking, UI FX mute, debounce, and voice release. The original art and animation speeds are unchanged.

TIME.EXE is 252px wide and shows hours/minutes/seconds in AM/PM format plus the local timezone and UTC offset. CALENDAR.DAT is 300px wide and shows the weekday, month/date/year, and a dynamically sized Sunday-first grid highlighting today. Both shrink on small screens, use a translucent navy/cyan pixel style, drag by their title bars, share desktop focus/stacking, retain their positions, and close independently with X or Escape. Closing returns focus to the matching object. Window resizing, content resizing, and first-open positioning keep them within the viewport. App windows intercept clicks above wallpaper hotspots.

`lib/local-time.ts` owns one second-aligned, lazily subscribed local-system clock. The existing wallpaper hands subscribe imperatively; open popups use the same snapshots through `useSyncExternalStore`. The server snapshot is null, and importing the module never starts a timer. Hidden tabs suspend updates and environmental motion; returning immediately synchronizes the clock/date. The timer and visibility listener are removed when the last subscriber leaves. Local Date calculations handle midnight, month/year boundaries, leap years, and DST without a fixed timezone.

Files changed:

- `lib/store-scene.json`: object bounds and face/keypad feedback regions.
- `components/StoreHotspots.tsx`: four accessible, label-free object toggles and initial positioning.
- `components/windows/StoreInfoWindows.tsx`: reusable information-window mounting, live time, and calendar content.
- `components/Window.tsx`: compact information size, dialog semantics, and resize observation for changing content.
- `components/Home.tsx`: mounts the two closed-by-default information windows.
- `lib/local-time.ts` and `components/StoreEnvironment.tsx`: shared local clock and calendar calculations; preserve continuously mounted animation layers.
- `app/globals.css`: object feedback and compact information-window styles.
- `lib/ui-sounds.ts` and `context/AudioContext.tsx`: quiet object hover families in the existing effects system.
- `tests/local-time.test.cjs`, `tests/ui-sounds.test.cjs`, `tests/browser-smoke.cjs`, and `package.json`: local-date/timer checks, sound tests, interactive regression checks, and `npm run test:time`.
- This document and `docs/ANIMATION_AUDIO_NOTES.md`: implementation and validation notes.

Verification:

- `npm run typecheck`: passed.
- `npm run test:time`: all 3 tests passed, covering leap years/century rules, local weekday/grid boundaries, accurate hand angles, shared subscriptions, local midnight/year rollover, hidden-tab synchronization, and timer/listener cleanup.
- `npm run test:audio`: all 29 tests passed, including object-tone levels, waveform families, shared debounce, and voice release.
- `npm run build`: passed with the existing parent-lockfile/workspace-root warning.
- `npm run test:browser`: complete production suite passed. New checks cover real local seconds synchronized with the SVG hands, independent popup toggles, leap-day/month/year rollover, hidden-tab date catch-up, AM/PM and UTC offsets in Taipei/New York, retained project selection, popup dragging/occlusion/close-focus behavior, sound mute, and all four hotspots in both themes at 1080p, 1440p, 4K, portrait mobile, and short landscape. Existing PC, lamps, continuous animation, apps, clouds, experience links, and music checks also passed. No runtime exceptions or missing assets were observed.
- `npm run lint`: attempted; unavailable because the existing repository does not install/configure ESLint.
- The running development page serves the new hotspot markup and information-window styles. Production screenshots and `browser-results.json` are in `.next/verification/`; information-window screenshots are `store-information-day.png` and `store-information-night.png`.
