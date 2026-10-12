# Dialogue subtitle provenance

The player displays spoken dialogue, not newly authored narration. Silent gaps remain blank.
Each source cue is intersected with the excerpt window, clipped to its boundaries, and shifted to the clip's time origin. Translation changes text only.

| Film            | Source                                                                                                                                         | Excerpt                          | Subtitle text licence                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Sintel trailer  | [English subtitle stream in Blender's official trailer MKV](https://download.blender.org/durian/trailer/Sintel_Trailer1.480p.DivX_Plus_HD.mkv) | Source 00:05–00:35, shifted -5s  | CC BY 3.0, © Blender Foundation / durian.blender.org                                                                               |
| Elephants Dream | [Wikimedia Commons English timed text and its contributors](<https://commons.wikimedia.org/wiki/TimedText:Elephants_Dream(HQ).webm.en.srt>)    | Source 00:45–01:15, shifted -45s | CC BY-SA 4.0 for this timed-text adaptation; retain this attribution and [licence](https://creativecommons.org/licenses/by-sa/4.0/) |
| Big Buck Bunny  | The excerpt has no spoken dialogue                                                                                                             | Source 00:30–01:00               | No dialogue subtitle track                                                                                                          |

The Elephants Dream film itself remains CC BY 2.5; its timed-text source is separately attributed and licensed. The data-only subtitle modules retain their notices; application code has its own licence.

Sintel's full-film subtitle timestamps must not be applied to the trailer. The English trailer track was extracted with:

```sh
ffmpeg -i Sintel_Trailer1.480p.DivX_Plus_HD.mkv -map 0:s:0 trailer-en.srt
```

The full source tracks are not required at runtime. The small, attributed excerpt cue data is versioned in `libs/catalogue/src/subtitles`.
