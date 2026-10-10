# Retro desktop UI refinement

## Interface changes

- Home is a compact application launcher capped at 480px, with content-based height (about 301px on desktop), shorter spacing, and the three navigation icons kept in one centered row. Short landscape screens use tighter spacing and 40px icons to keep the launcher within the desktop area. Existing title, subtitle, labels, and navigation remain. Launcher icons switch between the existing light and dark variants with the theme.
- Home, About.txt, Works.app, and Contact.app use one shared `rgba()` background at 70% opacity: pale leaf green in light mode (`215, 224, 201`) and dark blue in dark mode (`10, 35, 66`). Light title bars use the plant-inspired sage shades `#87a477` and `#749260`, with darker foliage-colored text and accents for contrast. Light-mode launcher and toolbar images are tinted to coordinate with the leaves. Adjust `--window-body-opacity`, the theme-specific `--window-glass-rgb`, and `--window-title-*` in `app/globals.css` to change the palette globally. Window surfaces inherit the active theme instead of overriding it. Bodies and About's wrapper remain transparent, avoiding stacked opaque fills. Text and controls retain normal element opacity. No backdrop blur is used.
- Application body text is 20px, About skills/details are 22px, section/project headings are 24–30px, and principal headings are 32–36px. Labels/tags are 16–18px and application action buttons are 18px. The existing VT323 font and personalized About content remain. The profile row scales down on small screens.
- Work keeps its existing list/detail navigation, with larger project titles, descriptions and technology labels. Work and Contact now use the existing custom retro scroll area, with keyboard-focusable content. Contact fields have visible, associated labels and larger text; existing destinations and form behavior are unchanged.
- Top-bar controls and launcher icons have no permanent decorative boxes. Hover highlighting, pressed movement, and `:focus-visible` outlines remain. The music pause control now uses two solid SVG pixel bars with `shape-rendering="crispEdges"` and the existing playback handler.

## Desktop behavior

- Application width is capped at 750px and shrinks to the viewport minus 24px. Body height is capped at 600px and adapts to short screens. Windows clamp their positions when opened, reopened, resized, and dragged.
- Clicking window content or focusing a control raises that window. Reopening a window retains its saved position and raises it over other windows.
- Header dragging uses pointer events and pointer capture for mouse and touch. Close buttons remain independent of dragging. Drag listeners and cursor state clean up on release, cancellation, closing, or unmount.
- Custom scrollbars observe both the viewport and inner content, so their thumb sizes update when content or layout changes. Track clicks, mouse thumb dragging, wheel/native touch scrolling, and keyboard scrolling remain available.
- Animated wallpapers, theme switching, audio, project data, contact links, and the personalized About sections are preserved. No dependencies or raster assets were added.

## Modified files

- `app/globals.css`
- `components/Home.tsx`
- `components/AudioPlayer.tsx`
- `components/Window.tsx`
- `components/RetroScrollArea.tsx`
- `components/windows/AboutWindow.tsx`
- `components/windows/WorksWindow.tsx`
- `components/windows/ContactWindow.tsx`
- `context/WindowContext.tsx`
- `tests/browser-smoke.cjs`
- `docs/UI_REFINEMENT_NOTES.md`

## Verification

- TypeScript check and production build pass. All 26 audio tests pass.
- Chrome checks cover compact launcher dimensions, shared 70% backgrounds without whole-window opacity, borderless controls and keyboard focus, pixel pause rendering, overlapping windows, body focus, reopening positions, project navigation, custom scrollbar dragging, responsive application bounds, and touch header dragging. The existing wallpaper, audio, and desktop checks remain included.
- Browser screenshots and results are written under `.next/verification/`, including application views in both themes and at mobile/landscape dimensions.
- `npm run lint` was attempted and cannot run: the project has no installed ESLint executable or configuration. No lint success is claimed. The existing parent-lockfile warning during builds remains.
