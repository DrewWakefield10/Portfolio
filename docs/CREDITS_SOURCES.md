# Sources.txt credits window

Click either of the machines beneath the right-hand aquarium to toggle one shared Sources.txt window. The hotspot uses the wallpaper's original coordinates and pans with the mobile scene. It uses the existing window, scroll area, focus restoration, and mobile application switcher; window dragging is unchanged.

Credits live in `lib/credits.ts` and are rendered by `components/windows/SourcesWindow.tsx`. The music list derives from the current playlists, so each of the eight current recordings appears once. The unidentified original portfolio mix was removed from both playlists at the owner's request. Existing selections of that mix fall back to the first supplied song without losing volume/mute preferences or autoplaying. Audio file bytes, gain, and animations are unchanged; verified title/artist metadata was updated.

## Attribution references

Verified on 2026-10-16:

- Original wallpaper artist, identified by the portfolio owner: [Pixel Jeff](https://pixeljeff1995.artstation.com/). The credit distinguishes the artist's original work from the portfolio's day/night adaptations and interactive additions. An exact original artwork permalink has not been supplied.
- Website inspiration, identified by the portfolio owner: [shar's desktop](https://www.sharyap.com/).
- Remember Summer Days — Anri: [song landing page](https://lnk.to/bfBsW1TB). Artist also appears in the supplied filename.
- Without U — Thelma Aoyama feat. 4Minute: [Universal Music release](https://www.universal-music.co.jp/aoyama-thelma/products/upch-5700/). Artists also appear in the supplied filename.
- Fairground — Pop Culture: [source video](https://youtu.be/EWZw-2v23_c), [listen/support](https://lofihiphop.de/fairground).
- Shibuya Sky — Dust Diggers & Hicks: [source video](https://youtu.be/O2I40GJJxqM), [listen/support](https://lofihiphop.de/shibuyasky).
- anyways — Fool Parsley: [source video](https://youtu.be/_SCGub7zIjs), [listen/support](https://lofihiphop.de/anyways). The file was originally labeled Fool Parsley; its actual track title is now corrected in the player and credits.
- When You're Ready — ARISU: [source video](https://youtu.be/yAlbyZx4aqw), [listen/support](https://lofihiphop.de/whenyourready).
- Midnight Pretenders — original song by Tomoko Aran: [Apple Music catalog entry](https://music.apple.com/us/song/midnight-pretenders/339701060). This is a song reference; the exact supplied recording/version remains unconfirmed.
- Wasurerarenaino — original song by Sakanaction: [Victor official release](https://www.jvcmusic.co.jp/-/Discography/A020936/VIDL-30565.html). This is a song reference; the exact supplied recording/version remains unconfirmed.
- VT323 — Peter Hull: [Google Fonts](https://fonts.google.com/specimen/VT323), with the designer confirmed in [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/vt323/METADATA.pb).
- Lucide and contributors: [official credits and licenses](https://lucide.dev/license), including its Feather-derived icon credits.
- Interface sound effects: synthesized by the existing portfolio code.

## Credits awaiting confirmation

The owner supplied the four YouTube links above. YouTube's public oEmbed titles and the videos' own descriptions identify the artists and corrected track title; all four are presented by Tama's Little Music Shop. Its channel is acknowledged in each source link, together with the artists and the descriptions' listen/support links. No license or permission beyond attribution is inferred from a video title.

Exact recording/version details for Midnight Pretenders and Wasurerarenaino, the exact original wallpaper permalink, and the original raster image/icon sources still need confirmation. Their available artist/song references are credited without inventing download sources. The retired original mix no longer appears in playback or the credits list; its unused file remains unchanged on disk.

Add confirmed details to `musicReferences` in `lib/credits.ts`; this does not require editing or importing the audio again. The window also provides a credit-correction email link.

## Changed files and checks

`lib/credits.ts`, `components/windows/SourcesWindow.tsx`, `lib/store-scene.json`, `components/StoreHotspots.tsx`, `components/Home.tsx`, `components/MobileWindowSwitcher.tsx`, and one theme-aware hotspot highlight in `app/globals.css` implement the feature. Existing mobile and Firefox browser tests now exercise the new machine hotspot and sources window; the mobile checks also verify owner links and complete, deduplicated soundtrack credits. `Window.tsx` is unchanged.

`lib/music.ts`, `public/music/catalog.json`, and the regenerated `lib/music-library.json` remove the legacy mix and correct supplied artist/title metadata. Audio and production browser checks now expect four supplied songs per theme; a new unit regression covers saved selections of the retired original mix. The Firefox harness also detects its known loopback endpoint when Windows relaunches the browser without forwarding the startup banner.

Verification passed: production build, TypeScript, ESLint, all 44 audio/time/fan unit tests, the full Chrome desktop/audio suite, Chrome touch checks at all eight required sizes, and native Firefox responsive checks. Tests cover the machine hotspot, owner/source links, eight distinct soundtrack credit rows, both themes, safe mobile bounds, original-selection fallback, and actual playback of every remaining song. No window-dragging code, audio file bytes, or music gain settings changed.
