# Additional music: ready-to-use generation brief

No music-generation tool is connected in this environment. No additional songs, empty audio files, or remote audio URLs were fabricated. The existing public/music.mp3 is preserved in both live playlists.

Eight planned tracks (four per theme) are defined in public/music/catalog.json. They are excluded from playback while their status is "planned". Generate original audio using a tool with suitable public-website usage rights. Confirm the licensing terms for the actual exported files.

## Add completed songs

1. Save each real MP3 at its designated public/music/day/ or public/music/night/ path below (Ogg is also supported; update the file field accordingly).
2. Add the artist field if known and change only completed entries to status "ready" in public/music/catalog.json.
3. Run `npm run music:sync`. The importer uses installed FFprobe to verify audio decoding and 60–180-second duration, rejects missing files/path escapes/duplicates, and writes only verified metadata into lib/music-library.json.
4. Run `npm run typecheck` and rebuild. lib/music.ts appends verified songs to the relevant existing playlist.
5. Audition volume and transitions. Target about -20 LUFS integrated, below -2 dBTP, with no excessive silence and a short natural tail. The importer checks decodability/duration; perceived loudness and loop quality still need an audition.

FFprobe is available on this workstation. Another workstation needs FFmpeg/FFprobe installed to promote new audio. Planned entries never cause missing-file requests. If only one song is available, Next/Previous preserve its current position; normal end-of-song looping continues.

## Window Seat (daytime)

Destination: `public/music/day/window-seat.mp3`
Track ID: `day-window-seat`

Original instrumental cozy daytime lo-fi, 76 BPM, mellow electric piano seventh chords, brushed soft drums, restrained warm bass, a gentle two-note motif, subtle tape texture. Friendly and productive, no vocals, no sharp snare or busy lead. Duration 120 seconds. Compose an original piece without imitating any existing song or artist. Use subtle evolving sections, consistent perceived level near -20 LUFS and peaks below -2 dBTP. Export stereo MP3 160–192 kbps or Ogg with a natural short tail and smooth loop boundary; no abrupt cutoff or long silence. Supply public-website usage rights.

## Paper Lantern (daytime)

Destination: `public/music/day/paper-lantern.mp3`
Track ID: `day-paper-lantern`

Original warm café instrumental, 82 BPM, lightly swung jazz-inspired electronic rhythm, soft felt-piano voicings, understated clean guitar accents, gentle bass. Welcoming sunlight mood; no vocals, no solos, no aggressive percussion. Duration 120 seconds. Compose an original piece without imitating any existing song or artist. Use subtle evolving sections, consistent perceived level near -20 LUFS and peaks below -2 dBTP. Export stereo MP3 160–192 kbps or Ogg with a natural short tail and smooth loop boundary; no abrupt cutoff or long silence. Supply public-website usage rights.

## Sunny Save Point (daytime)

Destination: `public/music/day/sunny-save-point.mp3`
Track ID: `day-save-point`

Original gentle retro-game background instrumental, 88 BPM, rounded sine/plucked synth tones, warm sustained chords and soft syncopated lo-fi drums. Calm, playful and unobtrusive, no recognizable game melodies, no bright square-wave lead. Duration 120 seconds. Compose an original piece without imitating any existing song or artist. Use subtle evolving sections, consistent perceived level near -20 LUFS and peaks below -2 dBTP. Export stereo MP3 160–192 kbps or Ogg with a natural short tail and smooth loop boundary; no abrupt cutoff or long silence. Supply public-website usage rights.

## Slow Saturday (daytime)

Destination: `public/music/day/slow-saturday.mp3`
Track ID: `day-slow-saturday`

Original relaxed daytime ambient instrumental, 70 BPM, soft electric piano, airy warm pads, sparse delicate shaker and tiny bell accents. Peaceful café productivity atmosphere, no vocals, no distracting melody or intense bass. Duration 120 seconds. Compose an original piece without imitating any existing song or artist. Use subtle evolving sections, consistent perceived level near -20 LUFS and peaks below -2 dBTP. Export stereo MP3 160–192 kbps or Ogg with a natural short tail and smooth loop boundary; no abrupt cutoff or long silence. Supply public-website usage rights.

## Blue Hour (nighttime)

Destination: `public/music/night/blue-hour.mp3`
Track ID: `night-blue-hour`

Original mellow nighttime synthwave instrumental, 78 BPM, dreamy analog pads, subdued electric-piano chords, a rounded soft bass pulse and restrained electronic drums. Calm futuristic shop ambience, no dramatic rise or bright lead. Duration 120 seconds. Compose an original piece without imitating any existing song or artist. Use subtle evolving sections, consistent perceived level near -20 LUFS and peaks below -2 dBTP. Export stereo MP3 160–192 kbps or Ogg with a natural short tail and smooth loop boundary; no abrupt cutoff or long silence. Supply public-website usage rights.

## Neon Rain (nighttime)

Destination: `public/music/night/neon-rain.mp3`
Track ID: `night-neon-rain`

Original atmospheric electronic nighttime instrumental, 72 BPM, muted plucked synthesizer, warm broad pads, gentle filtered rhythm, restrained bass and subtle rain-like synthesized texture. Soft cyberpunk atmosphere, no vocals, no thunder or intense bass. Duration 120 seconds. Compose an original piece without imitating any existing song or artist. Use subtle evolving sections, consistent perceived level near -20 LUFS and peaks below -2 dBTP. Export stereo MP3 160–192 kbps or Ogg with a natural short tail and smooth loop boundary; no abrupt cutoff or long silence. Supply public-website usage rights.

## After Hours (nighttime)

Destination: `public/music/night/after-hours.mp3`
Track ID: `night-after-hours`

Original cozy late-night ambient electronic instrumental, 66 BPM, sparse felt-piano notes, slowly changing gentle synth harmonies, minimal percussion and quiet analog warmth. Immersive and restful, no dramatic arrangement changes or recognizable melodies. Duration 120 seconds. Compose an original piece without imitating any existing song or artist. Use subtle evolving sections, consistent perceived level near -20 LUFS and peaks below -2 dBTP. Export stereo MP3 160–192 kbps or Ogg with a natural short tail and smooth loop boundary; no abrupt cutoff or long silence. Supply public-website usage rights.

## Last Train Home (nighttime)

Destination: `public/music/night/last-train-home.mp3`
Track ID: `night-last-train`

Original dreamy retro electronic instrumental, 84 BPM, mellow glassy keys, gentle analog arpeggio at low volume, smooth warm bass and a soft understated beat. Peaceful night journey mood, no vocals, no aggressive percussion or heroic synth lead. Duration 120 seconds. Compose an original piece without imitating any existing song or artist. Use subtle evolving sections, consistent perceived level near -20 LUFS and peaks below -2 dBTP. Export stereo MP3 160–192 kbps or Ogg with a natural short tail and smooth loop boundary; no abrupt cutoff or long silence. Supply public-website usage rights.


