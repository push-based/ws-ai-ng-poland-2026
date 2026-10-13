# Verification record

## Current reference app · 13 October 2026

The latest build, lint and all **30 tests** passed across the three Nx projects with Nx caching disabled after the caller correction. The initial preflight implementation passed its 26-test suite. Prettier and Git diff checks passed. The preceding source-teaching-comment pass also passed its 22-test suite.
The comment pass emitted identical JavaScript with comments removed; it did not alter application behavior.
Native movie-feature evidence below is from **12 October**; preflight/native agent checks were added on **13 October**, in the existing Chrome 154 experimental-API profile. This is not a clean-profile or remote-device rehearsal.

Current behavior: routed movie/side-panel URLs, home-only concierge, local comments with reviewable writing suggestions, sourced dialogue subtitles, and opt-in worker-based ONNX/WebGPU detection.
The final application update at the end records that verification. The original baseline entries below are retained as history and include older counts/UI terminology.

A clean exported checkout installed from the frozen lockfile, downloaded original media/model assets, generated clips/posters and passed build/lint/all 26 tests with no Nx cache hits. Clean-profile cold downloads and remote-attendee rehearsals remain to be done on those actual devices. See [coverage gaps](HANDBOOK-COVERAGE.md) and [evaluation scenarios](EVALUATION.md).

## Original baseline · 12 October 2026

### Automated checks

`pnpm nx run-many -t build lint test` passed for all three projects.
The suite contains **12 tests**: four catalogue/domain checks, six browser-side fixture/compatibility checks, and two real MCP stdio integration tests.
MCP tests assert modern (`2026-*`) and legacy (`2025-*`) negotiated revisions, then discover/call the tool, list/read resources, retrieve the prompt, and reject invalid inputs/resources.
`pnpm install --frozen-lockfile`, formatting checks and `git diff --check` passed.
All three bundled MP4 files have video and audio streams and a duration of 30 seconds; the complete media directory is approximately 9.3 MB.
The production app's initial JS/CSS totals approximately 461 kB raw / 108 kB estimated transfer, within the configured budget.

### Browser smoke tests

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

## Preflight and local caller · 13 October 2026

`/preflight` checked all seven AI APIs, Prompt image input, the reverse Polish-to-English pair, native WebMCP registration/discovery and a real WebGPU adapter. Diagnostics copied successfully and exported no comments/conversation content.
The browser discovered six imperative tools through **document.modelContext**. Undefined navigator.modelContext/modelContextTesting would be an incorrect support test for this implementation.

The local Prompt evaluation runner used typed structured argument objects and real native page-tool execution. Read, mixer extraction, negative-action handling, seek and ordered movie/mix journeys were exercised; actual slider values were compared with reported state. Cancellation returned to preflight with “Evaluation cancelled.”

Two consecutive final-development runs scored **5/6**, with different failures: one model replaced a requested 99 dB with 9 dB; after clearer descriptions/instructions, another model completed a seek and then performed unrelated movie/subtitle actions. Both were correctly failed. These are observed probabilistic caller errors, not reported successes or fixture substitutions. The successful mix case rendered exactly -5/+4/+2 dB and 65%, agreeing with the tool's state.
The first runner's JSON-inside-a-string bug was fixed with a typed arguments object, including valid empty arguments for a state read; regression tests cover that contract.

A successful run on one profile would not establish reliable agent behavior across participants. Keep the failed-case evidence and rerun in the actual workshop environment.

The already-loaded home page was tested with **tab-scoped CDP offline network emulation** after model/assets preparation. Native concierge inference returned Big Buck Bunny with a validated ID and reported 348/9216 context tokens. Networking was restored afterwards. This verifies prepared-page behavior under browser network emulation, not an OS-wide disconnect or a fresh-profile download.

The explicit fixture path also completed while the tab was offline, returning the labelled Elephants Dream fixture with simulated context. Both offline overrides were removed. Preflight's 390×844 layout had document width equal to viewport width (390), with no horizontal overflow; the temporary viewport was reset.

## Caller correction and repeated native verification · 13 October 2026

The caller now separates capability classification from per-capability parameter extraction. Each extraction uses a fresh Prompt session and a simple typed object; the application owns tool identity, full-plan validation, finite execution and completion. This avoids mixed-schema/history contamination and removes further model decisions after a successful action.
The model receives actual browser-discovered contracts and user requests, never evaluation IDs or expected grading answers. The grading function is unchanged.

All **six cases passed in three consecutive native runs** (18/18 case outcomes) in the same Chrome 154 profile. Recorded evidence includes exact calls, selected capabilities, before/after state and actual rendered mixer values:

- Read: actual `get_screening_state`, no change.
- Mix: -5/+4/+2 dB and 65%, with sliders agreeing.
- Invalid gain: 99 dB rejected before execution, existing values unchanged.
- Informational question: no state-changing tool.
- Seek: exactly one `seek_to` at 6 seconds, with no unrelated mutation.
- Journey: movie selection before the 0/0/0 dB, 30% mix; no autoplay.

The final strategy marker is `isolated-capabilities-v1`. Cancelling during inference returned to preflight with “Evaluation cancelled.”; browser error logs were empty in the passing tab.
The uncached 30-test gate covers scoped output contracts, whole-plan validation before effects, failure/cancellation without retry, and the existing application/domain/MCP checks. This supersedes the earlier 5/6 development results retained above.
