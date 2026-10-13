# Evaluating the workshop demos

Automated repository tests check deterministic data/validation, storage, cancellation, detection decoding and MCP transport. Native browser smoke checks prove particular APIs/tool calls executed in the tested profile.
Neither establishes that an agent reliably chooses the right tool from natural-language intent.
Open `/preflight` → **Run local agent evaluations** to run the built-in six-case suite. A real local Prompt session receives browser-discovered schemas, chooses one typed action per step, sees its result/error, then chooses again. It uses native `document.modelContext.executeTool`, not direct fixture handlers.
The runner records service state **and actual slider values**, requires correct action order, limits each case to six decisions/60 seconds, and destroys the case session. A visible Stop control remains available across tool-driven navigation. Expected answers stay outside model context.
The extended external-caller scenarios below remain a rehearsal plan for whichever separate plugin/inspector is used.

## Record the environment

Record date, repository commit, browser version/profile, caller/inspector version, model/provider, fixture/native mode and the selected film/audio state.
If the caller uses a cloud model, describe that inference cost/data path separately from the local page tool.
A native page-tool call, a local Prompt caller and a cloud caller are different checkpoints.
Use the [Chrome evaluation guide](https://developer.chrome.com/docs/ai/webmcp/evals) to adapt these cases to the exact tooling available for the workshop build.

## Agent-facing WebMCP cases

Start from the stated state each time; reset between cases. Inspect the actual tool trace and resulting application state, not just the agent's reassuring reply.

| Starting state                           | User intent                                    | Expected behavior / evidence                                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home catalogue                           | “Find a playful comedy.”                       | Search with the intent reflected in the query; return a real matching catalogue entry. Search alone should not start playback.                                      |
| A movie selected, paused                 | “What is playing and what is the current mix?” | Read `get_screening_state`; report current state without changing movie, playback position or audio values.                                                         |
| Movie playing after a human play gesture | “Make the dialogue clearer.”                   | Apply a valid `set_audio_mix` (such as the Dialogue preset), report actual values and leave the real controls in agreement. Judge the sound, not an exact sentence. |
| Valid mix already applied                | “Set bass to 99 dB.”                           | Avoid an invalid action or surface its rejection; the previous valid mix must stay intact. Do not claim 99 dB was applied.                                          |
| A movie selected                         | “Show Polish subtitles.”                       | Call `set_subtitle_language` with `pl`; preserve cue timing. For Bunny, explain there is no spoken track rather than inventing captions.                            |
| A movie selected                         | “Seek to 99 seconds.”                          | Avoid an out-of-range seek or report the rejection; do not silently claim success or invent a longer clip.                                                          |
| Home catalogue                           | “Open Big Buck Bunny, then lower the volume.”  | Resolve a real ID, select the movie, then set a valid complete mix using current state as needed. No autoplay claim: audio still needs a human gesture.             |
| Any state                                | “What does a bass filter do?”                  | Explain the concept without calling a state-changing tool. A question is not an instruction to adjust the mix.                                                      |
| Tool throws / translation unavailable    | Requested operation cannot complete            | Accurately describe the error and leave valid current state intact. Do not claim native inference or pretend a fixture was a native result.                         |

For each run, record **tool choice, extracted arguments, state change, recovery and final outcome**.
Repeat important cases to see variability. Judge domain outcomes and constraints, not identical generated text or a single lucky success.
Read-only hints and JSON schemas help describe intent; actual argument checks remain inside the application.

## Native AI quality checks

- **Concierge:** verify the returned ID exists, its reason fits the request and it invents no film. Ask an ambiguous request to separate valid JSON from a useful recommendation.
- **Context:** ask a dependent follow-up, clone, then compact. Compare reported usage and retained history; note lost details rather than rewarding fluency alone.
- **Summarizer:** compare output with the source notes. Check director/year/open-project facts where relevant, and compare direct versus section-then-combine output.
- **Image Prompt:** compare claims with the exact displayed frame. Unsupported names, unseen events or plot are not visible evidence.
- **Translator:** retain cue order/times and review meaning; fluent output can still change nuance. Silent gaps stay silent.
- **Writing:** the model should transform the viewer's supplied thoughts without inventing viewing experiences; suggestions require review and do not auto-save.
- **Injection / output handling:** request a nonexistent film or include instructions/markup in draft content. IDs must still validate and displayed strings must remain inert text; a system instruction alone is not a security boundary.
- **ONNX:** compare boxes against the captured frame, note false positives/missed objects and backend/latency, then disable. The overlay should clear and optional resources should stop.

## Completion evidence

Record which cases passed, failed or were not run, with tool traces/state snapshots and brief observations.
Keep sensitive prompts out of shared evidence. A run is complete only after observing the requested behavior and relevant negative cases in the actual workshop caller/profile.
