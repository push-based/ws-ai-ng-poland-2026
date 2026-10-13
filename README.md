# Nano Cinema · AI Poland 2026

A small local-first movie theatre for the **AI at Zero Token Cost** workshop.
Browse three open movies, ask a browser-native concierge, translate dialogue subtitles, summarize programme notes, describe a captured frame, and operate a real audio mixer through WebMCP.
Movie comments are saved in localStorage, with optional Writer/Rewriter/Proofreader assistance that edits a draft only after acceptance.
Each movie has a URL (`/movies/sintel`); Story, Comments and Sound are compact sidebar panels represented by a query parameter.
The concierge lives on the home page.

## Quick start

Use **Node 24.15+ within the 24.x line** (or Node 22.22.3+ within 22.x) and **pnpm 11**.
These Node versions satisfy the installed Angular package's engine requirement. Install from the committed lockfile.

Install **ffmpeg** (including ffprobe) and **unzip** first.
On macOS: `brew install ffmpeg`; unzip is normally already included.
On Debian/Ubuntu: `sudo apt-get install ffmpeg unzip`.

```sh
pnpm install --frozen-lockfile
pnpm media:download
pnpm start
```

Open **http://127.0.0.1:4200**. The ordinary cinema/player works without native AI; select **Fixtures** for deterministic AI examples when browser support is unavailable.
The TypeScript MCP companion is a separate optional process; it is not required to start the app.

### Optional ONNX / WebGPU demo

Run this after installing dependencies, before starting the app if you want to demonstrate object detection:

```sh
pnpm onnx:download
```

It downloads the checksum-pinned **YOLOX-Nano model (3.5 MiB)** and copies matching ONNX Runtime loader/WASM assets from the installed package.
The runtime files are larger than the weights; both stay out of Git. This command does **not** prepare Chrome's built-in AI models.

Open a movie → **Enable detection** → **Scan this frame**. The worker prefers WebGPU and reports a WASM fallback when needed.
Detection starts off and allocates no worker/model/GPU session until enabled. **Live tracking** is a separate opt-in for WebGPU, limited to one scan per second or slower, and stops on slow scans.
Disable detection to terminate the worker and clear boxes. Animated characters may produce weak or empty predictions; boxes are actual model output.
See [ONNX setup and architecture](docs/ONNX-EXTENSION.md).

### Browser preparation

1. Use an up-to-date **desktop Chrome** and open **http://127.0.0.1:4200/preflight → Check this device**. Copy diagnostics to share readiness; AI Inspector remains available inside the cinema.
2. In native mode, click **Prepare Prompt model**. Exercise Summarizer, subtitle translation and optional writing APIs separately; preparing Prompt does not prepare every API/language pair.
3. For WebMCP, follow the [local Chrome setup](#webmcp-and-audio), relaunch Chrome, then reopen the app.
4. If a task is unavailable, choose **Fixtures** explicitly. Missing writing APIs or WebGPU do not prevent the core workshop flow.
5. Finish downloads before testing offline, and keep the local server running.

Chrome's currently documented foundation-model requirements include **22 GB free profile-volume storage** and either **more than 4 GB VRAM**, or **16 GB RAM and 4 CPU cores**. These are built-in AI eligibility requirements, not the small ONNX model's download size. See [Chrome's requirements](https://developer.chrome.com/docs/ai/get-started); availability checks for the exact task remain decisive.
For model issues, inspect `chrome://on-device-internals`. Browser API exposure, device eligibility, downloaded models and successful inference are separate checkpoints.

### Media download and checks

`pnpm media:download` downloads approximately 230 MB of source material once, checks pinned SHA-256 hashes, and generates three 30-second clips and posters (approximately 9 MB).
It caches originals in `.cache/cinema-media` and skips work when generated files are valid.
Use `pnpm media:download --force` to regenerate from verified cached sources.
`pnpm media:check` validates local outputs without accessing the network.
The media and generated preview screenshots are excluded from Git; attribution stays in the repository and built app.
Serving/building fails with setup instructions if media is missing or changed.

`pnpm start` builds the shared catalogue before starting Angular and binds to loopback.

### Verify the repository

```sh
pnpm build
pnpm lint
pnpm test
```

For a production-built local preview:

```sh
pnpm nx serve-static movie-theater --host=127.0.0.1 --port=4201
```

## What to try

| Workshop concept                                 | Cinema demonstration                                                               | Start reading                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Availability, downloads and fallback             | AI Inspector → Setup; Native AI / Fixtures selector                                | [Capability checks](apps/movie-theater/src/app/ai/capabilities.service.ts)                       |
| Prompt sessions, streaming and structured output | Home-page concierge; ask a follow-up and inspect the real movie ID                 | [Recommendation pipeline](apps/movie-theater/src/app/features/concierge/concierge.service.ts)    |
| Finite context, clone and compaction             | Concierge context meter, Fork, Compact and Reset                                   | [Session ownership](apps/movie-theater/src/app/features/concierge/concierge-session.service.ts)  |
| Cancellation and safe streaming                  | Stop an active generation; observe traces and text-only output                     | [AI runtime](apps/movie-theater/src/app/ai/ai-runtime.service.ts)                                |
| Multimodal Prompt input                          | Movie → Describe this shot; compare the answer with the captured frame             | [Image Prompt adapter](apps/movie-theater/src/app/ai/prompt/prompt.api.ts)                       |
| Summarizer configuration and composition         | Story → type/length/format/preference; sections then combined summary              | [Summary pipeline](apps/movie-theater/src/app/features/notes/movie-summary.service.ts)           |
| Language detection and translation               | Polish concierge request; real dialogue subtitles translated with preserved timing | [Language adapters](apps/movie-theater/src/app/ai/language)                                      |
| Writer, Rewriter and Proofreader                 | Comments → generate a suggestion, review, accept, then save separately             | [Comment assistance](apps/movie-theater/src/app/features/comments/comment-assistance.service.ts) |
| MCP tools, resources and prompts                 | Read-only TypeScript stdio companion                                               | [MCP composition](apps/cinema-mcp/src/server.ts)                                                 |
| Declarative and imperative WebMCP                | Catalogue search form; Sound → real equalizer and tool calls                       | [Page tools](apps/movie-theater/src/app/core/webmcp/webmcp.service.ts)                           |
| App-managed model versus browser-managed AI      | Optional ONNX scan, worker inference, WebGPU/WASM and real overlay boxes           | [Worker pipeline](apps/movie-theater/src/app/features/detection/detector.worker.ts)              |

Source comments explain the workshop concepts beside their implementation. Angular fundamentals are assumed.
The [handbook coverage review](docs/HANDBOOK-COVERAGE.md) maps the plan to working features. `/preflight` includes copyable readiness diagnostics and a real local Prompt agent evaluation runner; normal cinema navigation stays simple.

## Tested versions

This is a **tested snapshot**, not a guarantee of support on every machine or a claim about the latest release.
Update desktop Chrome and recheck the exact tasks in your workshop profile.

| Component                             | Recorded version / evidence                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Chrome                                | **154.0.0.0**, native movie checks on 12 October and preflight/agent checks on 13 October in the existing experimental-API profile |
| Angular / Nx / TypeScript             | **22.1.8 / 23.3.0 / 6.0.3**, resolved local packages                                                                               |
| pnpm                                  | **11.21.0**, documentation review on 13 October 2026                                                                               |
| MCP TypeScript SDK / ONNX Runtime Web | **2.3.1 / 1.30.0**                                                                                                                 |
| Automated checks                      | Build, lint and **30 tests** passed on 13 October 2026; formatting passed                                                          |

The previous native checks used the trainer's existing configured Chrome profile. Clean-profile cold downloads and remote-participant checks must be rehearsed on the actual workshop devices; see [verification evidence](docs/VERIFICATION.md) and [trainer runbook](docs/WORKSHOP.md).

## Workspace

| Nx project      | Location             | Responsibility                                                               |
| --------------- | -------------------- | ---------------------------------------------------------------------------- |
| `movie-theater` | `apps/movie-theater` | Angular 22 standalone, zoneless application with signals and Signal Forms    |
| `cinema-mcp`    | `apps/cinema-mcp`    | Read-only TypeScript MCP server over stdio                                   |
| `catalogue`     | `libs/catalogue`     | Shared domain types, curated film data, search, audio presets and validation |

Projects import `@nano-cinema/catalogue` through its public package exports and pnpm workspace links.
Nx discovers both application → catalogue dependencies, runs prerequisite builds, caches build/test/lint targets, and enforces browser/server/shared boundaries.
The Node projects use TypeScript project references; the Angular project retains the generated strict Angular configuration.
ESLint targets are inferred through `@nx/eslint/plugin`, rather than the deprecated executor.
Angular excludes the shared catalogue from development prebundling, so it is bundled into the app using the app's workspace dependency rather than resolved from Vite's generated root.

Current Nx guidance: [TypeScript project linking](https://nx.dev/docs/kb/typescript-project-linking), [inferred task configuration](https://nx.dev/docs/guides/tasks--caching/convert-to-inferred).

## Native AI versus fixtures

Open **AI Inspector → Setup** to inspect exact-task availability and prepare the Prompt model.
Native mode invokes the actual browser APIs and surfaces failures; it does not substitute canned output.
**Fixtures** is an explicitly labelled, deterministic demo mode for unsupported devices or slow downloads.
Fixture context counts are simulated, captions support English/Polish, and frame descriptions are deliberately generic.

The core APIs are `LanguageModel`, `Summarizer`, `LanguageDetector`, and `Translator`.
`Writer`, `Rewriter`, and `Proofreader` are optional developer-trial extensions.
All native output is rendered as text, and movie recommendations are validated against real catalogue IDs.

Chrome may expose an API but still reject the selected language, model, modality, or device.
Download models from a visible user action before class.
Translator models are checked per requested language pair.
Image input is checked separately; the basic concierge uses English foundation-model input/output.
Polish requests can be detected, translated into English, processed, and translated back.
Language detection does not change the viewer's chosen subtitle language.
No cloud fallback, API key, analytics, remote fonts, or embedded third-party player is included.
After dependencies and browser models are prepared, the running local app and media can be used without an internet connection.
This is not a service-worker installation: keep the local server running.

## WebMCP and audio

For local development in a supported Chrome build, enable `chrome://flags/#enable-webmcp-testing`, relaunch and open the app.
The app registers six imperative page tools:

- `get_screening_state`
- `search_movies`
- `select_movie`
- `set_audio_mix`
- `set_subtitle_language`
- `seek_to`

Discover them in the WebMCP inspector/DevTools workflow for your tested Chrome version.
The catalogue's normal HTML search form also demonstrates declarative annotations (`toolname`, `tooldescription`, `toolparamdescription`).
The imperative audio mixer is the main demonstration, not a form submission.

The projection booth connects the HTML video through low-shelf, peaking and high-shelf filters, master gain, a compressor and an analyser.
Human faders, presets and page tools use the same validated methods.
The browser requires a human play gesture to unlock audio; selecting a film via a tool does not autoplay it.
The “agent direction” example buttons default to **direct local handler tests**.
When the browser exposes discovery/execution, enable the native WebMCP checkbox to discover and execute the real registered tools.
Neither path runs an agent model.
A narrow compatibility boundary accepts modern object arguments and retries the older JSON-string encoding only after a pre-execution parser error.
A cloud-powered inspector chat can incur its own inference cost; manual tool invocation does not require a cloud model.
Chrome's [current WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) also describes a local Prompt API caller for its tooling. Our `/preflight` runner supplies an independent local Prompt caller and invokes the browser's real discovered tools. The external extension's provider still needs checking before making a zero-cloud-cost claim.

**Run local agent evaluations** on `/preflight` tests six model-facing cases with actual WebMCP execution and observed slider values. Copy its report to retain the model decisions, arguments, errors and before/after state. Results can vary; failed cases stay visible. The caller classifies required capabilities, extracts each capability's arguments in fresh context, validates the resulting bounded plan, and stops after its final action. It never asks the model for more work after a fulfilled request. The suite still reports actual incorrect plans or state mismatches as failures. The corrected caller passed all six cases in three consecutive native Chrome runs; see the verification record.

[Evaluation scenarios](docs/EVALUATION.md) separate deterministic handler checks from model-dependent tool choice, argument extraction and recovery. The 30 repository tests are not an agent-quality evaluation suite.

### A caller says WebMCP is unavailable, but DevTools lists tools

Use **`document.modelContext`**, not `navigator.modelContext` or `navigator.modelContextTesting`. Those undefined navigator properties are not a valid support check for this app. Run this in the cinema page's DevTools context:

```js
const tools = await document.modelContext.getTools();
console.table(tools.map(({ name, description }) => ({ name, description })));
```

Our compatibility adapter tries object arguments, then the older JSON-string encoding only on a pre-execution parsing failure. Do not retry a handler failure: it could duplicate an action. See the [current imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).
After a successful mix call, fader values and output labels should agree with the response. Tools wait for the pending render before acknowledging success; local evaluations also read actual slider properties.
**Audio unlocked: false** is expected until a human clicks Play. A mix can be configured before audio is unlocked; it applies when the real audio graph connects.

## TypeScript MCP companion

```sh
pnpm nx build cinema-mcp
pnpm mcp
```

The server implements a catalogue search tool, three `cinema://movies/:id` resources and the `film_club_discussion` prompt.
It does not control the browser's player or run a model itself.
The SDK v2 `serveStdio` entry negotiates the modern/legacy protocol era.
Tests spawn the built server and exercise both client modes over the actual stdio transport.

Example host configuration (substitute your own absolute repository path):

```json
{
  "mcpServers": {
    "nano-cinema": {
      "command": "node",
      "args": ["/absolute/path/ws-ai-ng-poland-2026/apps/cinema-mcp/dist/main.js"]
    }
  }
}
```

Run the compiled Node entry directly from an MCP host.
Do not use an Nx command as the stdio host command: Nx's task output is not MCP wire data.
Diagnostics go to stderr; stdout is reserved for the protocol.

## Workshop guide and assets

See [the verification snapshot](docs/VERIFICATION.md), [the runbook](docs/WORKSHOP.md), [media credits](apps/movie-theater/public/media/ATTRIBUTION.md), and [the optional ONNX detector](docs/ONNX-EXTENSION.md).
All three locally generated clips are edited to 30 seconds; the video/still assets total approximately 9 MB and are not committed.
A published build containing those assets still needs attribution; download-on-setup does not remove their Creative Commons terms.
Subtitles contain sourced spoken dialogue, shifted to the excerpt timestamps. Big Buck Bunny has no dialogue subtitles. See [subtitle provenance](docs/SUBTITLES.md) for the separate timed-text licences.
The supplied notes describe the original films; the excerpts are short demonstrations rather than complete screenings.

The complete implementation remains intact.
No participant TODOs or exercise framework have been introduced.

## Read the architecture

| Area                 | Entry point                                               | Responsibility                                                                                   |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| App shell and routes | `app.ts`, `app.routes.ts`                                 | Shared header/inspector and lazy-loaded URLs                                                     |
| Discover             | `features/discover`                                       | Catalogue search and the home-page concierge                                                     |
| Screening            | `features/screening`                                      | Route inputs and compact Story/Comments/Sound panels                                             |
| Native AI            | `ai/prompt`, `ai/summarizer`, `ai/language`, `ai/writing` | One small adapter per browser API; explicit creation/cancellation/destruction                    |
| Execution            | `ai/ai-runtime.service.ts`                                | Task state, progress, safe streaming, cancellation and traces                                    |
| Concierge            | `features/concierge`                                      | Conversation composition, separate session ownership and structured recommendation validation    |
| Comments             | `features/comments`                                       | Draft assistance, validation and localStorage persistence; accepting a suggestion never posts it |
| Page tools           | `core/webmcp`                                             | Separate domain tool definitions, native registration and transport compatibility                |
| Detection            | `features/detection`                                      | Opt-in worker-based ONNX/WebGPU inference and real overlays                                      |
| Shared domain        | `libs/catalogue/src/index.ts`                             | Public exports; movie data, search, audio validation and subtitle data are separate modules      |
| MCP server           | `apps/cinema-mcp/src/server.ts`                           | Composition root; tools/resources/prompts each have their own module                             |
| Asset setup          | `tools/media`, `tools/download-onnx.ts`                   | Download/generation logic independent of application code                                        |

Components keep TypeScript, Angular templates and CSS in separate files.
Prettier uses the Angular parser for templates, including modern control flow; comments explain lifecycle ownership and validation boundaries.
