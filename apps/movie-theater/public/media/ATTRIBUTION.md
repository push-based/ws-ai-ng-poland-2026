# Local screening assets

These files are excerpts and derived stills of Blender open-movie productions, not public-domain assets.
The app shows attribution under the player. This file travels with the built media.
The film audio remains part of its film excerpt; no separately distributed soundtrack file is used.
Workshop caption tracks are newly authored programme commentary, not official dialogue transcripts.

| Files                      | Attribution                                                                           | License                                                   | Changes                                                                |
| -------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `bunny.mp4`, `bunny.jpg`   | © 2008 Blender Foundation / www.bigbuckbunny.org                                     | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 00:30–01:00 excerpt, resized/re-encoded; still at excerpt +12s         |
| `dream.mp4`, `dream.jpg`   | © 2006 Blender Foundation / Netherlands Media Art Institute / www.elephantsdream.org | [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/) | 00:45–01:15 excerpt, resized/re-encoded; still at excerpt +12s         |
| `sintel.mp4`, `sintel.jpg` | © copyright Blender Foundation / durian.blender.org                                  | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 00:05–00:35 trailer excerpt, resized/re-encoded; still at excerpt +12s |

Source and reuse statements:

- Big Buck Bunny: https://peach.blender.org/about/
- Elephants Dream: https://orange.blender.org/blog/creative-commons-license-2/
- Sintel: https://durian.blender.org/sharing/

Downloaded originals (not committed):

- https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v.zip
- https://download.blender.org/ED/elephantsdream-480-h264-st-aac.mov
- https://media.w3.org/2010/05/sintel/trailer.mp4

## Reproduce locally

Run `pnpm media:download` from the repository root.
The TypeScript script verifies pinned source SHA-256 hashes, extracts the exact archive member, generates 30-second excerpts and posters with ffmpeg, and validates duration/audio/video with ffprobe.
Downloads are cached in `.cache/cinema-media`; downloads, generated media and preview screenshots are excluded from Git.
Use `pnpm media:check` to validate local files and `pnpm media:download --force` to regenerate.

A public repository may redistribute these licensed excerpts with the required attribution.
This repository chooses download-on-setup to reduce repository size.
Publishing the generated app/media still requires attribution and license notices; the download script does not waive those terms.
