# About.txt interactions

The existing About.txt profile, skills, education, languages, scrolling, and theme styling are preserved. Light mode uses the plant-inspired sage palette; dark mode uses navy and cyan. Standard app windows retain the shared 70% glass background; interest clouds use a lighter, more opaque fill for readable text.

## Skills

Each skill now has a short rising triangle-wave terminal blip (65–85ms) and a 2px horizontal highlight. The existing global audio provider selects this sound instead of the ordinary hover sound. Moving between children of one skill does not retrigger it. Skill and ordinary hover tones share the existing rate limiter and single released voice, and the global UI sound setting mutes both. Keyboard focus provides the same feedback. Browsers require an initial user gesture to unlock audio.

## Interests

Linux, Retro UI, Game Development, Open Source, and Web Design retain their original SVG pixel icons and one centered label each, with a subtle glow and a 2px upward highlight. Launch icons use sage green in light mode and cyan blue in dark mode; the clouds contain no icons. The redundant tooltip label was removed entirely, preventing doubled names even if tooltip styles fail to load. Descriptions and keywords live in one typed configuration. No personal accomplishments were added.

Each interest opens a compact pixel-cloud dialog through the existing window manager. The reusable InterestCloudPopup uses a stepped SVG silhouette, a short fade-in, and a content-fitted layout no wider than 320px. It shows the title, description, and visible close control without an icon, rectangular title bar, or keyword grid. Padding keeps the controls inside the cloud outline; short screens allow the description to scroll using the wheel or keyboard.

The entire cloud supports pointer/touch dragging, including its description and padding. Interactive controls are excluded so the close button remains clickable. Standard app windows retain title-bar dragging. Clouds retain shared stacking order, viewport clamping, independent closing, and reuse on repeated clicks. Opening a cloud focuses its close button; Escape closes it and returns focus to its trigger. Buttons work with Enter/Space. Reduced-motion preferences suppress the movement, fade, and pixel animation.

## Experience navigation

All five existing entries and summaries are displayed inside their own 250px-high RetroScrollArea below the EXPERIENCE.LOG heading. The heading remains outside the inner scroller. Wheel, keyboard, touch, and the existing square retro scrollbar scroll the list independently of About.txt; overscroll containment prevents wheel chaining at the list boundaries. The rotation interval, fade timeout, previous/next controls, and progress indicators remain removed.

| Experience | Existing project selected |
| --- | --- |
| Portfolio Development | `2` — Portfolio Website |
| Authentication Dashboard | Informational; no matching project in the existing catalog |
| Retro Desktop Website | `2` — Portfolio Website |
| Face Recognition Research | Informational; no matching project in the existing catalog |
| Game Development Projects | `1` — Retro Arcade |

The shared `openProject(projectId)` action validates the ID, selects the detail view, and opens or raises the one existing Works.app window. Its Back button returns to the original four-project catalog. Missing mappings remain visible with “Project details not added yet” and do not navigate to unrelated projects. Add their real project records and IDs to the shared catalog/mappings when those details are available. Existing project descriptions, technology stacks, and URLs are unchanged.

## Files in this update

- `components/windows/AboutWindow.tsx`: skill feedback hooks, clickable interests, static experience list and project navigation.
- `components/windows/WorksWindow.tsx`: reads shared catalog and context selection.
- `components/windows/InterestWindows.tsx`: mounts the configured interest clouds.
- `components/InterestCloudPopup.tsx` (new in the cloud update): reusable compact popup using the shared Window component.
- `components/InterestIcon.tsx` (new): shared original pixel-grid SVG symbols.
- `components/Home.tsx`: mounts interest windows alongside the existing apps.
- `components/Window.tsx`: optional cloud presentation with dragging from the entire cloud, compact sizing, focus return, and Escape support; retains shared viewport logic and standard window title-bar dragging.
- `context/WindowContext.tsx`: shared selected-project state, selection, and guarded openProject action.
- `context/AudioContext.tsx`: delegates skill pointer/focus feedback through the existing sound settings.
- `lib/about.ts` (new): typed interests, descriptions, and experience-to-project mappings.
- `lib/projects.ts` (new): original project catalog extracted without duplicating its details.
- `lib/ui-sounds.ts`: dedicated skill variants sharing throttling, voice release, and audio context.
- `app/globals.css`: theme-aware icon colors, stepped-cloud presentation, contained experience scrolling, and interaction styling with reduced-motion support.
- `tests/ui-sounds.test.cjs`: verifies distinct skill tones, quiet/short envelopes, shared throttling, and voice release.
- `tests/browser-smoke.cjs`: checks single labels, launch-icon colors, icon-free compact clouds and close-control containment, dragging from cloud body/padding with a mouse and from the description with touch, reuse/focus, keyboard close/reopen, mobile bounds, reduced motion, independent experience scrolling and boundary containment, and project navigation/missing mappings. Retains the skill, audio, wallpaper, and desktop checks.
- `docs/ABOUT_INTERACTIONS_NOTES.md` (new): implementation and verification notes.

## Verification

- `npm run typecheck`: passed (standalone check; the existing Next build configuration skips type checking).
- `npm run test:audio`: all 28 tests passed, including the subsequent light-switch sound coverage.
- `npm run build`: passed; retains the existing multiple-lockfile workspace-root warning.
- `npm run test:browser`: passed against the production server on port 3100, including the existing wallpaper, music, desktop, and responsive checks. No runtime exceptions or missing audio/wallpaper assets. Screenshots and `browser-results.json` are saved in `.next/verification/`.
- `npm run lint`: unavailable because the repository's lint script references ESLint, which is not installed/configured. No dependencies were added for this update.
