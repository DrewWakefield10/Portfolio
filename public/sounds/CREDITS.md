# Cat meow

`cat-meow.mp3`: **Meow of a Siamese cat** by **freemaster2**.

- Original: https://www.freesound.org/people/freemaster2/sounds/66518/
- Reviewed source and original WAV: https://commons.wikimedia.org/wiki/File:Meow_of_a_Siamese_cat_-_freemaster2.wav
- License: **CC0 1.0 Universal Public Domain Dedication**, https://creativecommons.org/publicdomain/zero/1.0/
- Source file: https://upload.wikimedia.org/wikipedia/commons/8/81/Meow_of_a_Siamese_cat_-_freemaster2.wav
- Source checked: 2026-10-24.
- Changes: trimmed trailing silence to 1.12 seconds, high-pass at 70 Hz, low-pass at 6.5 kHz, attenuated by 6 dB, 12 ms fade-in and 140 ms fade-out, encoded as 44.1 kHz mono 64 kbps MP3.
- Playback adds a restrained 0.25 gain and uses the existing UI FX preference. No recorded audio is generated or synthesized.

FFmpeg recipe (input is the original downloaded WAV):

```powershell
ffmpeg -i meow-source.wav -t 1.12 -af "highpass=f=70,lowpass=f=6500,volume=-6dB,afade=t=in:d=0.012,afade=t=out:st=0.98:d=0.14" -ar 44100 -ac 1 -codec:a libmp3lame -b:a 64k cat-meow.mp3
```
