# Focus Sounds audio

All eight tracks are bundled locally and ready for the existing Focus Sounds mixer.
No API key, third-party runtime request, account or paid audio service is needed.
Files are fetched only when the user enables a track.

## Sources and license

Every recording is published under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
The original Freesound pages were checked on 2026-09-29. CC0 permits copying,
modification and redistribution, including commercial use, without mandatory attribution.
Credits are retained here for provenance and courtesy to the recordists.

| File | Recording / author | Length | Size |
| --- | --- | --- | --- |
| `rain.mp3` | [Soft Rain Ambience edlarez vsnr.wav](https://freesound.org/people/visionear/sounds/573335) — visionear | 45s | 721 KB |
| `fireplace.mp3` | [Fire in the stove](https://freesound.org/people/mcmikai/sounds/532191) — mcmikai | 45s | 721 KB |
| `wind.mp3` | [Wind blowing in a field in Texas, USA](https://freesound.org/people/felix.blume/sounds/217506/) — felix.blume | 45s | 721 KB |
| `ocean.mp3` | [Waves of Hawaii](https://freesound.org/people/florianreichelt/sounds/450755) — florianreichelt | 45s | 721 KB |
| `forest.mp3` | [Early summer, czech wood outside the camp, early morning ambiance](https://freesound.org/people/J.Zazvurek/sounds/353311) — J.Zazvurek | 45s | 721 KB |
| `cafe.mp3` | [Bustling Cafe Ambience](https://freesound.org/people/Talitha5/sounds/509950) — Talitha5 | 29s | 465 KB |
| `thunder.mp3` | [Thunder-H2-without-windstoper.mp3](https://freesound.org/people/Boryslaw_Kozielski/sounds/316831/) — Boryslaw_Kozielski | 60s | 961 KB |
| `brown-noise.mp3` | [01 Brown Noise.mp3](https://freesound.org/people/georgedyer/sounds/171552/) — georgedyer | 29.235s | 469 KB |

Rain, fireplace, ocean, forest and cafe were downloaded from Freesound's public
high-quality MP3 previews. They were discovered through
[Ambiently's source catalog](https://github.com/abhinandansharma/ambiently/blob/8b99d668e91957d80b66d419fae5cb0dba2be528/demo/public/sounds/CREDITS.json).
Wind, thunder and brown noise use the edited Ogg copies distributed by
[Noisekun](https://github.com/mateusfg7/Noisekun/tree/d32024c67aba7c0577e1609944af00b9df1b7775/.github/assets/sounds),
whose credits identify the original authors above (edits credited to Mateus Felipe).
The individual recordings' CC0 licenses are distinct from those projects' code licenses.

`sources.json` records each exact download URL, source and output SHA-256, author,
license, retrieval date, length, size and processing gain. Keep it with these files.

## Audio preparation

- Nature loops: 45 seconds; brown noise: 29.235 seconds; cafe: 29 seconds; thunderstorm: 60 seconds.
- Each excerpt starts at the beginning of its downloaded source. The first second
  is moved to the end and crossfaded with the final second using equal-power curves.
  This smooths the wrap boundary without a fade to silence on each repetition.
- Static gain targets -24 dBFS RMS, constrained by a -6 dBFS peak ceiling. This
  keeps headroom for mixing; levels can still be adjusted with individual sliders.
- Encoded with FFmpeg/libmp3lame as 128 kbps stereo MP3 at 44.1 kHz with Xing metadata.
  The encoder's gapless metadata is retained; exact loop-gap behavior still depends
  on the browser's HTMLAudioElement implementation.
- All eight final files were fully decoded with FFmpeg `-xerror` successfully.
  Browser playback and subjective listening were not tested in this session.

Total audio size: 5.50 MB. No project dependency was added;
the conversion tool and unprocessed downloads were kept outside the repository.

## Replacing a recording

Replace the corresponding MP3, preserving its filename, or edit the catalog in
`lib/ambientSounds.ts`. Update this document and `sources.json` with the new source,
license and hashes. Avoid recordings containing music without separate permission.

Preferences remain browser-local (`pomo:ambient:v1`). Reload restores selection and
levels without autoplay; Play saved mix resumes enabled tracks. Closing the window
keeps playback going; leaving the workspace disposes its audio elements.
