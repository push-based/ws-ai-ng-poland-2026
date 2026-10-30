# AI at Zero Token Cost: workshop exercises

Hands-on exercises for the **AI at Zero Token Cost** master class (JS Poland, 16 November 2026).
Every exercise uses the Nano Cinema app in this repository. You write small pieces of real code against the browser's built-in AI, MCP and WebMCP. A ready-made page shows your result immediately.

| You want to…                           | Open                                                                  |
| -------------------------------------- | --------------------------------------------------------------------- |
| See every exercise, its time and level | [EXERCISES.md](EXERCISES.md)                                          |
| Work through one exercise step by step | `workshop/exercises/<id>-….md`, e.g. [2-1](exercises/2-1-sessions.md) |
| Write your code                        | `apps/movie-theater/src/app/lab/exercises/<id>-…/exercise.ts`         |
| Try your code in the browser           | **http://127.0.0.1:4200/lab**                                         |
| Check your code automatically          | `pnpm lab:check <id>`                                                 |

---

## 1 · One-time setup (do this before the workshop)

You need **desktop Chrome** (up to date), **Node 24.15+** (or 22.22.3+), **pnpm 11** and a code editor (VS Code is fine).

```sh
git clone https://github.com/push-based/ws-ai-ng-poland-2026.git
cd ws-ai-ng-poland-2026
pnpm install --frozen-lockfile
```

Then choose **one** way to start the app:

| Command                                 | When to use it                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm media:download` then `pnpm start` | Recommended. Downloads the three open movies once (~230 MB, needs `ffmpeg`) so the cinema pages and exercise 2.5's video frame work.                               |
| `pnpm lab:start`                        | Quick start without media. Every lab exercise works; in 2.5 you upload your own picture instead of capturing a video frame. The cinema's video player stays empty. |

Wait for `Local: http://127.0.0.1:4200/`, then open **http://127.0.0.1:4200/preflight → Check this device** in Chrome. It tells you which built-in AI APIs your laptop can run.

- **Prepare the Prompt model** on `/preflight` before the workshop. The first download is large and is only needed once.
- **For Block 4 (WebMCP)**: open `chrome://flags/#enable-webmcp-testing`, set it to **Enabled** and relaunch Chrome.
- **Your laptop cannot run built-in AI?** No problem. Every lab page has a **Use simulated browser AI** switch, and `pnpm lab:check` always uses the simulation. You can do every exercise. Only the answers are simple, predictable texts instead of real model output.

---

## 2 · How every exercise works

Each exercise follows the same five-step loop:

1. **Open the page.** Go to `http://127.0.0.1:4200/lab/<id>` (for example `/lab/2-1`). The page is ready-made: buttons, inputs and an **Event log**.
2. **Open your file.** The page shows its path under **1 · Edit**. In VS Code press `Cmd+P` (macOS) or `Ctrl+P` (Windows/Linux) and type the file name.
3. **Follow the exercise guide.** Open `workshop/exercises/<id>-….md` (the page shows its path under **2 · Follow**). Each step says why it matters and which `todo(...)` line to replace, and ends on something you can see or check. Try the step yourself first: the skeleton and the solution sit behind collapsible **reveals** you open when you need them.
4. **Save and try.** The app reloads by itself. Click the buttons for that step. Unfinished steps show a 🧩 hint in the Event log instead of an error.
5. **Check.** In a second terminal run `pnpm lab:check <id>`. Every ✔ is a working step; a ✖ explains what to change.

> [!TIP]
> Open the **skeleton** reveal first when a step feels large. It shows the shape of the function and leaves the logic to you. The **solution** reveal is the finished function from `workshop/solutions/<id>/`.

### Helper commands

Run these from the repository root (the folder with `package.json`):

| Command               | What it does                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm lab:list`       | Lists all exercises and the files you edit.                                                                          |
| `pnpm lab:check 2-1`  | Checks exercise 2.1 against the simulated AI (works offline, on any laptop). `pnpm lab:check all` checks everything. |
| `pnpm lab:solve 2-1`  | Copies the reference solution into place. Your own version is kept next to it as `exercise.ts.mine`.                 |
| `pnpm lab:reset 2-1`  | Restores the original starter file from Git (your version is kept as `.mine`).                                       |
| `pnpm lab:mcp-client` | Runs your MCP client from exercise 4.2.                                                                              |

Fell behind? `pnpm lab:solve <id>` lets you skip any exercise and continue with the next one. Exercise 4.5 uses your 4.4 tools, so solve 4.4 first if you skip it.

---

## 3 · Exercises by agenda block

| Agenda block                              | Sub-block                            | Exercises                                                                                                     |
| ----------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **1 · The AI-native browser**             | From cloud AI to browser AI          | 1.1 Local, cloud or hybrid from measured cost                                                                 |
|                                           | Browser built-in AI                  | 1.2 Feature and capability detection · 1.3 Downloading and initializing a model · 1.4 Progressive enhancement |
| **2 · Prompt API**                        | Sessions, system and initial prompts | 2.1 Sessions and system prompts                                                                               |
|                                           | Streaming responses                  | 2.2 Streaming responses                                                                                       |
|                                           | Structured output                    | 2.3 Structured output                                                                                         |
|                                           | Context windows                      | 2.4 Managing the context window                                                                               |
|                                           | Multimodal                           | 2.5 Multimodal prompts with text and images                                                                   |
| **3 · Task-specific browser AI APIs**     | Summarizer API                       | 3.1 The Summarizer API · 3.2 Streaming summaries · 3.3 Summarizing documents larger than the context          |
|                                           | Bonus                                | 3.4 Translating subtitles · 3.5 Writing assistance with human review                                          |
| **4 · Model Context Protocol and WebMCP** | MCP                                  | 4.1 Exposing catalogue data from an MCP server · 4.2 Writing an MCP client                                    |
|                                           | WebMCP                               | 4.3 Declarative WebMCP · 4.4 Imperative WebMCP · 4.5 Bonus: a local agent at zero token cost                  |

Bonus exercises are optional. Do them if you finish early or at home.

---

## 4 · Native AI vs. simulation: what to expect

|              | Native (switch off)                                | Simulated (switch on, and in `pnpm lab:check`)                           |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Who answers  | Chrome's on-device model                           | A small script with predictable texts. No model runs.                    |
| Good for     | Real quality, real latency, real download progress | Learning the API calls and testing your logic on any laptop              |
| Token counts | Reported by the browser                            | Estimated as ~4 characters per token                                     |
| WebMCP       | Needs `chrome://flags/#enable-webmcp-testing`      | A stand-in `document.modelContext` is added only if the browser has none |

The simulation never pretends to be the real thing. The page shows a **SIMULATED** banner while it is on.

---

## 5 · General troubleshooting

| Problem                                      | Fix                                                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm start` stops with a media error        | Run `pnpm media:download` (needs `ffmpeg`), or use `pnpm lab:start`.                                     |
| The page does not update after saving        | Look at the terminal running the app: a TypeScript error names the file and line. Fix it and save again. |
| 🧩 `Not implemented yet …` in the Event log  | Expected: that step still contains `todo(...)`. Replace the whole line as the exercise guide shows.      |
| `… is not exposed by this browser`           | Use desktop Chrome, check `/preflight`, or switch on **Use simulated browser AI**.                       |
| A model "downloads" for a long time          | First downloads are large. Watch `chrome://on-device-internals`. Use the simulation meanwhile.           |
| `pnpm lab:check` says `The build failed`     | A TypeScript error in your file. The message above it shows the file and line.                           |
| WebMCP: `document.modelContext` is undefined | Enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome, or switch on the simulation.         |
