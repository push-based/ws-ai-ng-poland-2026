# Nano Cinema · AI Poland 2026

A small local-first movie theatre for the **AI at Zero Token Cost** workshop.
Browse three open movies, ask a browser-native concierge, translate commentary captions, summarize programme notes, describe a captured frame, and operate a real audio mixer through WebMCP.

## Run

Use a current Angular-compatible Node LTS and pnpm (the committed lockfile uses pnpm 11).

```sh
pnpm install
pnpm media:download
pnpm start
```

Install **ffmpeg** (including ffprobe) and **unzip** before the media command.
On macOS: `brew install ffmpeg`; unzip is normally already included.
On Debian/Ubuntu: `sudo apt-get install ffmpeg unzip`.

`pnpm media:download` downloads approximately 230 MB of source material once, checks pinned SHA-256 hashes, and generates three 30-second clips and posters (approximately 9 MB).
It caches originals in `.cache/cinema-media` and skips work when generated files are valid.
Use `pnpm media:download --force` to regenerate from verified cached sources.
`pnpm media:check` validates local outputs without accessing the network.
The media and generated preview screenshots are excluded from Git; attribution stays in the repository and built app.
Serving/building fails with setup instructions if media is missing or changed.

Open http://127.0.0.1:4200. `pnpm start` builds the shared catalogue before starting Angular.
The app binds to loopback; the MCP server is not needed for browser features.

```sh
pnpm build
pnpm lint
pnpm test
```

For a production-built local preview:

```sh
pnpm nx serve-static movie-theater --host=127.0.0.1 --port=4201
```

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

Open **Workshop Lens → Setup** to inspect exact-task availability and prepare the Prompt model.
Native mode invokes the actual browser APIs and surfaces failures; it does not substitute canned output.
**Fixtures** is an explicitly labelled, deterministic teaching mode for unsupported devices or slow downloads.
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

See [the verification snapshot](docs/VERIFICATION.md), [the runbook](docs/WORKSHOP.md), [media credits](apps/movie-theater/public/media/ATTRIBUTION.md), and [the future ONNX extension](docs/ONNX-EXTENSION.md).
All three locally generated clips are edited to 30 seconds; the video/still assets total approximately 9 MB and are not committed.
A published build containing those assets still needs attribution; download-on-setup does not remove their Creative Commons terms.
Captions are **authored programme commentary**, not official dialogue transcripts.
The supplied notes describe the original films; the excerpts are short demonstrations rather than complete screenings.

The complete implementation remains intact.
Participant TODOs and exercise branches will be prepared only after the final app is reviewed.
