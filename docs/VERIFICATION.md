# Verification snapshot · 12 October 2026

## Automated checks

`pnpm nx run-many -t build lint test` passed for all three projects.
The suite contains **12 tests**: four catalogue/domain checks, six browser-side fixture/compatibility checks, and two real MCP stdio integration tests.
MCP tests assert modern (`2026-*`) and legacy (`2025-*`) negotiated revisions, then discover/call the tool, list/read resources, retrieve the prompt, and reject invalid inputs/resources.
`pnpm install --frozen-lockfile`, formatting checks and `git diff --check` passed.
All three bundled MP4 files have video and audio streams and a duration of 30 seconds; the complete media directory is approximately 9.3 MB.
The production app's initial JS/CSS totals approximately 461 kB raw / 108 kB estimated transfer, within the configured budget.

## Browser smoke tests

Tested in the existing macOS Chrome profile reporting **Chrome 154.0.0.0**.
This profile already exposes the experimental APIs/WebMCP; no browser flags were changed by this implementation.
Availability checks and native creation/inference are separate checkpoints.

| Feature           | Observed result                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| Prompt            | Native streaming recommendation returned a valid Big Buck Bunny catalogue ID                                      |
| Language Detector | Native Polish detection returned `pl`, confidence approximately 0.99986                                           |
| Translator        | Native English → Polish commentary translation displayed Polish captions with unchanged timing                    |
| API composition   | Polish concierge request translated through English reasoning and returned a Polish recommendation                |
| Summarizer        | Native teaser generated from the synopsis                                                                         |
| Section summaries | Five native section summaries combined into a final key-points result; Markdown/speed options exercised           |
| Image input       | Native Prompt described the captured video frame; image and result displayed together                             |
| Writer            | Native programme introduction generated                                                                           |
| Rewriter          | Native casual rewrite returned; model suggestions remain reviewable before acceptance                             |
| Proofreader       | Native correction changed “realy” / “teh” to “really” / “the”                                                     |
| Sessions          | Native clone completed; compaction reduced reported context from 365 to 228 tokens in the exercised conversation  |
| Cancellation      | Cancelling a native section-summary task showed “Cancelled.” and re-enabled generation                            |
| WebMCP discovery  | Browser discovered seven tools: six imperative operations and the declarative catalogue form                      |
| WebMCP execution  | Native discovery/execution applied bass -5, mid +4, treble +2 dB and volume 0.65 while playback/audio were active |
| Invalid tool args | Native bass 99 dB invocation failed; the valid mixer values stayed unchanged                                      |
| Media/search      | Catalogue search narrowed the list; all three local clips entered playing state successfully                      |
| Fixtures          | Fixture recommendation streaming and simulated context were visibly labelled                                      |
| Keyboard          | Workshop Lens focused on open, made the background inert, dismissed on Escape and restored focus to its trigger   |
| Responsive        | Screening room at 390 × 844 had document width equal to viewport width (390), with no horizontal overflow         |

The browser was observed to require JSON-string WebMCP arguments.
The compatibility boundary first uses the documented object encoding and retries only the older pre-execution parser failure.
Tests ensure application/handler failures never cause a repeated action.

These are execution/interaction smoke tests, not a guarantee of model factual accuracy or identical outputs on another device.
Optional writing APIs and WebMCP remain experimental.
Full offline rehearsal and an external natural-language agent/inspector run remain trainer preflight checks; the in-page native WebMCP execution was tested without an agent model.
Revalidate on the actual participant/trainer browser build before the November workshop.

Preview screenshots, clips and posters are now generated locally and excluded from Git. Film stills are derived from the credited open-movie assets; see [media attribution](../apps/movie-theater/public/media/ATTRIBUTION.md).

## Download-on-setup update

The TypeScript media setup script was tested with fresh downloads of all three sources, pinned SHA-256 verification, local excerpt/poster generation, and ffprobe validation.
A repeat run correctly skipped downloading/generating valid assets.
Temporarily removing a generated poster made `pnpm media:check` fail with setup instructions; the poster was restored afterwards.
Script typechecking and lint passed. All three Nx projects' build/lint/test targets passed with the media prerequisite enabled.
Generated media, source caches and preview screenshots are ignored by Git; the attribution document remains versioned.

## Refactor and final application update

Baseline application commit: `15fe2e2`, audited to exclude downloaded media, generated previews, models, caches and credentials.
The code now uses feature folders with separate TypeScript/Angular templates/CSS, one native adapter per AI API, separate conversational session ownership, and separate MCP/WebMCP capability modules.
Prettier is configured with the Angular template parser; lifecycle and validation rationale is documented beside the relevant code.

The header now contains home branding and AI Inspector only. Movies use `/movies/:id`, with Story/Comments/Sound panels stored in the URL query parameter. The concierge remains on the home page.
Comments are stored in localStorage after explicit save; a native proofreading suggestion was accepted and saved, then verified after refreshing the movie URL. Writer also returned a reviewable comment suggestion.
The Agenda tab and workshop scheduling metadata have been removed from the app.

Dialogue subtitles replaced the authored commentary tracks. Sintel cues come from Blender's embedded trailer subtitles; Elephants Dream uses separately attributed Wikimedia timed text. Big Buck Bunny has no dialogue track. Cue validation allows real silent gaps.

The optional YOLOX-Nano model ran in Chrome's WebGPU worker and detected a person at 93% confidence in the Sintel frame, with a measured 41 ms inference. Detection starts disabled; no model/worker is created until explicit opt-in. Live tracking is separately enabled and throttled; disabling terminates the worker.
Generated runtime assets are excluded from both Git and source linting; they are copied from the locked ONNX Runtime package without modification.
The detector runtime and page components are lazy chunks; the initial production JS/CSS is approximately 373 kB raw / 89 kB estimated transfer, within the original budget.

The expanded suite contains 22 tests across the three Nx projects, including cancellation/late model ownership, local comment storage, detection decoding, and zero-work-before-opt-in lifecycle checks.
