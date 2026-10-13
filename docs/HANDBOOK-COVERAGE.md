# Handbook coverage review · 13 October 2026

Compared with **AI at Zero Token Cost — Trainer Handbook, 6 October 2026**, especially sections 4–12 and the section 17 rehearsal checklist.
The handbook is a trainer reference; its scheduling and exercise metadata stays outside the cinema UI.
This review covers the complete reference app. Participant exercises will be derived later.

## Concepts represented in the app

| Handbook area                                           | Repository coverage                                                                                                                         | Limits / delivery note                                                                                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §4–5: eligibility, availability, downloads and fallback | Inspector shows user agent and exact-task capability checks; explicit native/fixture modes; creation progress/cancellation                  | **Implemented:** `/preflight` provides shareable readiness checks and copyable diagnostics, including image input, reverse translation pair, native page-tool discovery and an optional GPU adapter check.                    |
| §5: built-in AI versus bring-your-own model             | Browser-managed AI adapters beside the opt-in app-managed YOLOX/ONNX worker                                                                 | ONNX weights/runtime need separate setup. This is a useful architecture contrast, not a mandatory core exercise.                                                                                                              |
| §6: sessions and initial prompts                        | Grounded concierge context and explicit session ownership/destruction                                                                       | Native Prompt stays in the page; our ONNX worker does not imply that the built-in Prompt API can be moved into a worker.                                                                                                      |
| §6: streaming, cancellation and safe output             | Shared stream reader, AbortSignal propagation, late-result guards; outputs displayed as text                                                | Fixtures demonstrate UI behavior, not native model quality or native availability.                                                                                                                                            |
| §6: structured output                                   | JSON response constraint plus catalogue ID validation                                                                                       | The app does not offer an unconstrained-JSON comparison mode. Explain shape versus truth using a real generated recommendation; valid JSON can still be a poor choice.                                                        |
| §6: context usage, clone, overflow and compaction       | Usage/window meter, clone, reset, overflow tracing, summarize then recreate                                                                 | No automated context-pressure demonstration. Trainers can repeat follow-ups and explain an input-too-large failure without forcing one live.                                                                                  |
| §6: multimodal input                                    | Actual captured canvas passed to the Prompt API                                                                                             | Image demonstration only; audio input and trial-only sampling controls are advanced discussion, not required app features.                                                                                                    |
| §7: task-specific APIs                                  | Summarizer style, length, format, preference; source notes; semantic-section summary-of-summaries                                           | Notes are deliberately small. The multi-stage path teaches a lossy strategy, not production-scale document ingestion.                                                                                                         |
| §7: Polish composition                                  | Language detection → translation to English → reasoning → translated reason; separate subtitle translation                                  | Foundation-model language support and Translator pair support are different checks. Translation can lose nuance.                                                                                                              |
| Writing extensions                                      | Writer/Rewriter/Proofreader suggestions on viewer notes; explicit review/accept/save                                                        | Experimental APIs are optional; their absence must not block the core day.                                                                                                                                                    |
| §8: MCP                                                 | Real TypeScript stdio server with search tool, per-film resources and discussion prompt; modern/legacy integration tests                    | Read-only companion, not a backend for the player. See the test's explicit client `versionNegotiation` for modern negotiation. Tasks, Skills and MCP Apps remain advanced discussion.                                         |
| §9: declarative/imperative WebMCP                       | Annotated human search form plus six imperative operations, including an actual Web Audio equalizer                                         | Native discovery/execution was checked. Local example buttons are handler tests, not autonomous agent inference.                                                                                                              |
| §9.7: WebMCP evaluation                                 | Deterministic checks plus a working local Prompt agent/native WebMCP runner on `/preflight`; [extended evaluation scenarios](EVALUATION.md) | Six executable cases cover selection/extraction, invalid-input recovery, no unrequested action and a multi-tool journey; reports include actual slider values. External plugin/provider paths still need their own rehearsal. |
| §10: trust and security                                 | Text-only rendering, validated IDs/tool values, human-reviewed comment edits, bounded reversible player operations                          | This toy app has no accounts, payments or destructive tools. Confirmation/authorization, consequential hints and cross-origin delegation need trainer explanation; a metadata hint is not enforcement.                        |

## Handbook gaps closed

- **Shareable preflight:** `/preflight` reuses the capability checks, adds exact image/reverse-language checks, shows readiness colours and exports diagnostics. Hardware storage/VRAM are explicitly unmeasured.
- **Model-facing evaluations:** `/preflight` has a bounded local Prompt caller that executes native browser-discovered tools, feeds outcomes back to the model and grades observed state/DOM values. Model failures are recorded rather than replaced with fixtures.

Both features are implemented in the complete reference app; no unfinished participant edition has been introduced.

## Remaining trainer gates

The handbook's section 17 asks for these before delivery. Existing development-profile smoke tests do not satisfy all of them:

- A clean exported checkout passed frozen install, real media/model downloads and all repository checks on this machine. Repeat on the second trainer laptop.
- Clean Chrome profile, demonstrating cold download states and exact task support.
- Prepared-model run with networking disconnected, including explicit fixture fallback.
- Remote-attendee rehearsal from another device/account.
- Short backup recordings/screenshots for core demos.
- Revalidate browser API status, languages, WebMCP tooling, MCP revision and optional extensions around 9 November, then record a workshop-tested tag and participant setup instructions.

## Documentation change since the handbook

The 6 October handbook describes the Inspector's default cloud-backed caller. The [current Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp), updated 7 October, additionally describes a local Prompt API caller for its tooling.
Keep the caller's provider explicit and verify that path before choosing it for the zero-cloud-inference demo. This repository's recorded checks exercised page-tool discovery/execution, not that external local-agent path.
