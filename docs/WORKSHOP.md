# Trainer runbook

## Before the workshop

1. Install dependencies, install ffmpeg/ffprobe and unzip, run `pnpm media:download`, then run `pnpm build`, `pnpm lint`, `pnpm test`.
2. Start the app, open AI Inspector and check capabilities for the actual device.
3. Prepare Prompt and try a native request. Prepare the en → pl Translator by changing caption language, then repeat in native mode to verify it is cached.
4. Exercise Summarizer, image input and the optional writing APIs independently.
5. Enable WebMCP in the workshop Chrome profile and verify native tool discovery and calls with the inspector for that build.
6. Play all three clips, check audio, seek, and test caption timing.
7. Test the compiled MCP server in the intended host or use `pnpm nx test cinema-mcp` for the wire-level smoke test.
8. Recheck official Chrome/Angular/MCP documentation one week before class. Record browser version, repository commit, API availability and which optional demos were tested.
9. Test the app with the network disconnected only after dependencies and browser models have downloaded. Keep the local server running.

## The day, in one app

| Time        | Block             | App path and demonstration                                                                                                                        |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10:00–10:15 | Opening           | Discover → show the complete film-to-booth flow                                                                                                   |
| 10:15–11:20 | AI-native browser | Inspector → capability matrix, exact options, model preparation, native/fixtures                                                                  |
| 11:35–12:50 | Prompt API        | Concierge → stream, Stop, follow-up, structured movie ID; fork, reset, compact; pause video and describe a shot                                   |
| 13:35–14:35 | Task APIs         | Programme notes → teaser/TL;DR/key points/headline; length; sections then combined summary; translate captions to Polish; detect a Polish request |
| 14:50–15:25 | MCP               | TypeScript companion → discover search tool, read notes resource, get discussion prompt                                                           |
| 15:25–16:40 | WebMCP            | Declarative search form, then actual audio mixer via imperative tools; validate bad arguments and inspect state                                   |
| 16:40–17:00 | Wrap-up           | Inspector → trace and architecture decisions; explain which calls stayed local                                                                    |

## Repeatable demo scenarios

### Concierge

Ask “An atmospheric adventure”, then “What if I prefer a playful comedy?”
Observe streamed explanation, the validated catalogue ID and context usage.
Fork the session and make a different request; the original session remains isolated until reset.
Compact the conversation and compare context usage with the retained source history.
Use Stop during a longer generation; verify the task releases its busy state.
Polish example: “Szukam zabawnego filmu na wieczór”.
Inspect the detector and translation steps in the trace; translation-before-reasoning can lose nuance.

### Summarizer

Use the same source and compare type/length controls.
Teaser uses the curated synopsis; other styles can use the complete notes.
Enable “Summarize sections, then combine”; inspect section results in the trace.
Verify the result includes director, release year and open-project context when those are relevant.
A summary-of-summaries is lossy; do not grade it purely by fluency.

### Screening

Play the local clip, pause, then “Describe this shot”.
Compare visible facts against the captured image; naming unseen characters or inventing plot is a model error.
Translate dialogue subtitles into Polish before resuming playback.
Cue times stay unchanged; compare original and translated text in the supplied catalogue and UI.

### Comments

Open a movie’s Comments panel, enter rough notes, and use Help me write, Adjust tone, or Check spelling.
Review the suggested version before accepting it into the draft, then save separately.
Refresh the movie URL to demonstrate localStorage persistence.

### Projection booth

Play once to unlock the audio context.
Use Dialogue and Night presets; the spectrum should respond to the actual soundtrack, not decorative random data.
Use direct handler examples first, explicitly labelling them as local tests.
Then enable the native WebMCP checkbox, or invoke `set_audio_mix` through the native WebMCP inspector, with:

```json
{ "bass": -5, "mid": 4, "treble": 2, "volume": 0.65 }
```

Check faders, audible change and `get_screening_state`.
Reject `{"bass":99,"mid":0,"treble":0,"volume":0.7}` without changing the valid mix.
Call `select_movie`, `seek_to` and `set_subtitle_language` and inspect their state transitions.
Search forms remain usable by people; imperative tools represent application operations.
An inspector agent can be cloud-powered even though page tools are local.

## Recovery

- Missing APIs / unavailable device: switch visibly to Fixtures and continue teaching the application contract.
- Download pending: show progress; cancel rather than consuming the exercise window.
- Native error: keep the error visible, inspect exact language/modalities, and retry with supported options.
- Translator unsupported pair: keep the original captions; use a supported pair or English/Polish fixtures.
- Silent audio: use the Play button to unlock audio and confirm output volume/device.
- WebMCP absent: check the local flag and Chrome build; demonstrate local handler validation while clearly stating that transport remains unverified.
- Cloud inspector chat unavailable: inspect schema and invoke tools manually.
- Wrong model output: compare source data and validate IDs; valid JSON does not prove the recommendation is correct.

## Later participant edition

Once the complete app is approved, remove small, bounded API implementations for the six handbook exercises.
Retain the working player, catalogue, media, design and fixture mode so participants concentrate on API concepts.
Do not create unfinished exercises in this reference version.
