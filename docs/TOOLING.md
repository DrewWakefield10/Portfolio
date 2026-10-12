# Local linting and audio tools

ESLint is installed and connected to the project and VS Code. The existing pnpm lockfile records the dependency versions; no second package-manager lockfile is introduced.

## Installed lint dependencies

- `eslint` 9.39.5 and `@eslint/js` 9.39.5.
- `eslint-config-next` 16.2.6, matching the installed Next.js version. It supplies the React, Hooks, accessibility, imports and TypeScript lint plugins.
- `globals` 16.4.0 for the Node scripts and browser callbacks in the Chrome test harness.
- VS Code extension `dbaeumer.vscode-eslint` 3.0.34, installed through the VS Code CLI.

ESLint 9 is used because the React plugin required by this Next.js configuration declares support through ESLint 9, not 10. The package registry marks ESLint 9 as unsupported; moving to 10 requires a compatible plugin stack rather than a blind major-version update. This setup preserves the existing framework version and has no peer-dependency conflict.

`eslint.config.mjs` follows the [Next.js flat configuration](https://nextjs.org/docs/app/api-reference/config/eslint), adding JavaScript correctness checks for Node scripts/tests. TypeScript rules apply to TypeScript files, so CommonJS test imports remain valid. Generated build output and `next-env.d.ts` are ignored. Browser globals are enabled only for the CDP harness that evaluates callbacks in the page.

The two one-time theme/fan preference restoration effects have local, documented exceptions to `react-hooks/set-state-in-effect`: restoring localStorage after hydration keeps the server and initial browser markup consistent. Other Hooks checks remain enabled. The drag-end callback now uses a named function for listener removal instead of referring to its enclosing variable during initialization.

## Commands and editor

- `pnpm install --frozen-lockfile`: restore the recorded dependencies.
- `npm run lint`: lint the application, scripts and tests; fail on errors or warnings.
- `npm run lint:fix`: apply supported automatic fixes, then enforce the same zero-warning limit.
- `npm run typecheck`: run TypeScript independently.
- `npm run build`: create a production build. Lint is a separate check.
- `npm run test:browser`: existing Chrome desktop/audio regression suite against a production preview on port 3100.
- `npm run test:mobile`: Chrome touch input across phones, tablets, and desktop viewports; `CHROME_PATH` can select Edge instead.
- `npm run test:firefox`: native Firefox responsive, pointer, scene-panning, and music checks via WebDriver BiDi.

See [Mobile compatibility](MOBILE_COMPATIBILITY.md) for setup, verified viewports, browser limitations, and generated reports.

`.vscode/settings.json` enables flat-config validation for JavaScript/TypeScript and automatic workspace-directory detection. `.vscode/extensions.json` recommends the installed ESLint extension for other checkouts. No formatter or automatic save behavior is changed. If VS Code was open during installation, reload its window to activate the extension; diagnostics use this project's local ESLint configuration.

## Audio dependencies and external connection

FFmpeg and FFprobe are already installed and available on PATH. The optional numerical analysis script can already import NumPy 2.2.6 and SciPy 1.16.2. No additional audio dependency was needed:

- `npm run music:analyze` fully decodes and measures real music files.
- `npm run music:sync` verifies explicitly-ready songs before activating them.
- `python scripts/analyze-music-rhythm.py public/music.mp3` provides optional tempo/spectrum estimates, not a musical transcription.

The user cancelled Runway generation and supplied eight MP3s instead. Those songs are now active, with four per theme and measured playback attenuation. No external service, account connection, API credentials or credits are needed for this collection. The earlier generation briefs are archived outside the active catalog. See [SUPPLIED_MUSIC.md](SUPPLIED_MUSIC.md).

## Verification

`npm run lint` passes with zero warnings. TypeScript, production build, all 43 audio/time/fan unit tests, music analysis and music import pass. The complete Chrome browser suite also passes, including all eight supplied songs, window/cloud dragging, theme/fan preference restoration, audio controls and responsive layouts; no runtime exceptions or missing assets occurred. The pnpm manifest and lockfile agree under an offline frozen-lockfile check. Original and supplied audio remain unchanged.
