# Exercise 3.1: The Summarizer API

In block 2 we wrote prompts ourselves. In this exercise we will turn a movie's programme notes into a TL;DR, a teaser, key points or a headline with Chrome's built-in Summarizer, where you pick type, length and format from three drop-downs instead of writing a prompt. The work runs on the device: no API key, no token bill.

**Page:** http://127.0.0.1:4200/lab/3-1 · **You edit:** `apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise.ts` · **Check:** `pnpm lab:check 3-1` · **Time:** ~15 min · **Level:** core

## Goal

At the end of this exercise **Summarize** turns the notes of _Sintel_ into a summary whose shape follows the drop-downs: a paragraph for **tldr**, a list for **key-points**, one line for **headline**.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/3-1 in Chrome. Look at the box **Use simulated browser AI** near the top of the page:

- It says **NATIVE**: your Chrome exposes built-in AI. Keep the switch off. The badge checks the Prompt API; the Summarizer has its own availability, which you check in Step 2.
- It says **NO BUILT-IN AI DETECTED**: turn the switch on. Your code then runs against a simulation. Its "summaries" are the first sentences of the text, but every step of this exercise works the same way.

Open `exercise.ts`. `programmeNotes()`, `englishLanguages` and the `SummarizerSupport` type at the top are given. You write the four functions below them, each of which still calls `todo('3-1', …)`.

Why a task API instead of the Prompt API? You could ask the Prompt API to "summarize this in three bullet points", too. A task API such as the Summarizer is a narrower tool:

- Fewer decisions for you. You pick from a small set of options (`type`, `length`, `format`) instead of writing and testing a prompt. The same options give the same kind of result across your app.
- A setup made for the job. The browser can use a model setup tuned for summarizing. You don't maintain that setup, and it can improve with browser updates.
- Its own availability. `Summarizer.availability()` answers for summarizing with your options. A device may support one task API and not another, so each one is checked on its own.

The output still comes from a small on-device model, and you still review it. When you need something the options cannot express (a custom answer format, a conversation), the Prompt API is the better tool.

## 1. Describe the summary you want

A summarizer is configured once, when you create it, so we start by building its options object:

| Option                                     | Values                                             | Meaning                                                                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`                                     | `'tldr'`, `'teaser'`, `'key-points'`, `'headline'` | tldr: a short overview. teaser: the most interesting parts, to make the reader curious. key-points: a bulleted list. headline: one line, like a title.                                                       |
| `length`                                   | `'short'`, `'medium'`, `'long'`                    | How much text. The meaning depends on the type: for key-points it is the number of bullets, for a headline the number of words. Chrome's documentation lists the targets; the model treats them as guidance. |
| `format`                                   | `'markdown'`, `'plain-text'`                       | Markdown can contain `-` bullets and `**bold**`. Plain text has no markup.                                                                                                                                   |
| `sharedContext`                            | any text                                           | Background that applies to every summary of this summarizer, for example who the readers are.                                                                                                                |
| `expectedInputLanguages`, `outputLanguage` | language codes such as `'en'`                      | The languages you send and want back. `availability()` then answers for these languages.                                                                                                                     |

In `summaryOptions()`, return `englishLanguages` plus `type`, `length` and `format`. Add `sharedContext` only when it is not empty after trimming.

<details>
  <summary>summaryOptions() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise.ts
export function summaryOptions(
  type: SummarizerType,
  length: SummarizerLength,
  format: SummarizerFormat,
  sharedContext?: string,
): SummarizerCreateOptions {
  const options: SummarizerCreateOptions = {
    ...englishLanguages,
    type,
    length,
    format,
  };
  if (sharedContext?.trim()) options.sharedContext = sharedContext.trim();
  return options;
}
```

| Code                    | Meaning                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `...englishLanguages`   | The spread operator copies `expectedInputLanguages` and `outputLanguage` into the new object.                |
| `type, length, format`  | Short for `type: type, length: length, format: format`.                                                      |
| `sharedContext?.trim()` | `?.` skips the call when `sharedContext` is `undefined`. `trim()` removes spaces, so `'  '` counts as empty. |

</details>

Save. In section **B**, click **Preview summaryOptions()**. You see JSON with `type`, `length`, `format`, both language fields and your shared context. Clear the shared-context field and preview again: `sharedContext` disappears.

## 2. Check availability with these options

Every built-in AI API follows the same routine: feature detection (does the API exist?), then a capability check (can it run these options?), then create. This step is the first two parts. `Summarizer.availability(options)` answers `'unavailable'`, `'downloadable'`, `'downloading'` or `'available'`. We add our own answer, `'missing'`, for a browser that has no `Summarizer` at all, so the page can show a badge instead of crashing.

In `summarizerAvailability()`, return `'missing'` when there is no `Summarizer` global, otherwise the answer of `Summarizer.availability(options)`.

> [!TIP]
> Test for the global with `typeof Summarizer === 'undefined'`. In a browser without the API, reading the name `Summarizer` directly throws a `ReferenceError`; `typeof` is the one operator that is safe on a name that may not exist.

<details>
  <summary>summarizerAvailability() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise.ts
export async function summarizerAvailability(
  options: SummarizerCreateOptions,
): Promise<SummarizerSupport> {
  if (typeof Summarizer === 'undefined') return 'missing';
  return Summarizer.availability(options);
}
```

</details>

Save and click **Check availability**. A badge appears next to the heading of section B, and the log says `Summarizer with these options: …`. In the simulation the badge says **downloadable** until the simulation has created its first model (in this exercise or an earlier one), and **available** after that. On a prepared device with the native model it says **available**; **downloadable** means the model is downloaded on first use.

## 3. Create a summarizer

`Summarizer.create(options)` returns a summarizer object. Two extras make it production-ready:

- `signal`: an `AbortSignal`. If the user cancels, creating (and a running download) stops.
- `monitor`: a function that receives a monitor object. It fires `downloadprogress` events with `event.loaded` from 0 to 1 while Chrome downloads the model. We forward that number to `onProgress`, and the page draws a progress bar.

In `createSummarizer()`, call `summarizerAvailability()` first and throw a readable `Error` for `'missing'` and for `'unavailable'`. Then call `Summarizer.create()` with the same options plus the signal and a `downloadprogress` monitor.

> [!WARNING]
> Pass the same options object to `availability()` and `create()`. The check answers only for the options it was given, so checking one set and creating with another proves nothing.

<details>
  <summary>createSummarizer() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise.ts
export async function createSummarizer(
  options: SummarizerCreateOptions,
  signal?: AbortSignal,
  onProgress?: (loaded: number) => void,
): Promise<Summarizer> {
  const support = /* Step 2, with these options */;
  /* 'missing'     → throw a readable Error */
  /* 'unavailable' → throw a readable Error */

  return Summarizer.create({
    ...options,
    /* the signal */
    monitor(monitor) {
      /* forward event.loaded of every 'downloadprogress' event to onProgress */
    },
  });
}
```

</details>

The two checks are plain `if`/`throw` lines with messages a person can act on. `'downloadable'` is fine: `create()` downloads the model first. In the monitor, `addEventListener('downloadprogress', …)` and call `onProgress?.(event.loaded)`, since `onProgress` is optional.

<details>
  <summary>createSummarizer() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise.ts
export async function createSummarizer(
  options: SummarizerCreateOptions,
  signal?: AbortSignal,
  onProgress?: (loaded: number) => void,
): Promise<Summarizer> {
  const support = await summarizerAvailability(options);
  if (support === 'missing')
    throw new Error(
      'The Summarizer API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if (support === 'unavailable')
    throw new Error(
      'The Summarizer cannot run these options (languages, type, format) on this device.',
    );

  return Summarizer.create({
    ...options,
    signal,
    // The monitor reports model download progress as a number from 0 to 1.
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) =>
        onProgress?.(event.loaded),
      );
    },
  });
}
```

| Code                                           | Meaning                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `await summarizerAvailability(options)`        | Reuse Step 2 instead of repeating it.                                                       |
| `...options, signal`                           | The checked options, plus the signal that cancels creation and a running download.          |
| `monitor.addEventListener('downloadprogress')` | `event.loaded` goes from 0 to 1 during the download; the page turns it into a progress bar. |

</details>

The download can take a while, and Chrome may only allow it after a user action such as a click. That is why the page creates the summarizer from the **Summarize** button, which Step 4 wires up. Run `pnpm lab:check 3-1` in a second terminal: `Step 3 · createSummarizer creates with the same options, the signal and a download monitor` and `Step 3 · createSummarizer reports a clear error when the API is missing or unavailable` turn ✔.

## 4. Summarize one text and clean up

`summarizer.summarize(text, { context, signal })` resolves with the whole summary as a string. `context` is background for this request only, while `sharedContext` (Step 1) applies to every request of the summarizer. A summarizer holds memory on the device, so we call `destroy()` when we are done. We create one summarizer per request, so we destroy it in a `finally` block: that code runs after success, after an error and after a cancel.

In `summarize()`, create a summarizer with `createSummarizer()`, return the result of `summarize(text, { context, signal })`, and destroy the summarizer in `finally`. Pass `context` only when it is not empty after trimming.

> [!WARNING]
> Write `return await summarizer.summarize(…)` inside `try`. Without `await`, the function leaves the `try` block before the summary is ready, and `finally` destroys the summarizer while it is still working.

> [!WARNING]
> Show the model's Markdown as text, as this page does. Model output is untrusted text, not trusted HTML: render Markdown only through a sanitizing Markdown library, and keep `innerHTML` out of the path.

<details>
  <summary>summarize() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise.ts
export async function summarize(
  text: string,
  options: SummarizerCreateOptions,
  signal?: AbortSignal,
  context?: string,
  onProgress?: (loaded: number) => void,
): Promise<string> {
  const summarizer = /* Step 3 */;
  try {
    /* return await the summary, with context and signal */
  } finally {
    /* release the model */
  }
}
```

</details>

Inside `try`, call `summarizer.summarize(text, { context: context?.trim() || undefined, signal })` and return it with `await`. Inside `finally`, call `summarizer.destroy()`.

<details>
  <summary>summarize() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise.ts
export async function summarize(
  text: string,
  options: SummarizerCreateOptions,
  signal?: AbortSignal,
  context?: string,
  onProgress?: (loaded: number) => void,
): Promise<string> {
  const summarizer = await createSummarizer(options, signal, onProgress);
  try {
    return await summarizer.summarize(text, {
      context: context?.trim() || undefined,
      signal,
    });
  } finally {
    // One summarizer per request: release the model even when summarize() failed.
    summarizer.destroy();
  }
}
```

| Code                                | Meaning                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `context?.trim() \|\| undefined`    | An empty or blank context field sends no context at all.                     |
| `return await summarizer.summarize` | Wait for the summary inside `try`, so `finally` runs after it is ready.      |
| `finally { summarizer.destroy(); }` | Release the model's memory after success, after an error and after a cancel. |

</details>

Save, then in section **C** click **Summarize**:

1. Keep **tldr / short / plain-text**. You get a short paragraph about _Sintel_ and a timing line (`… ms · … characters in, … out`). While the simulation still reports **downloadable**, the first click also shows the download progress bar.
2. Switch the type to **key-points** and summarize again: a list. Change the length to **long**: more bullets.
3. Switch to **headline**: one line.
4. Switch the format to **markdown** with key-points. The page shows the `-` characters as they are, on purpose.
5. Type `The reader is choosing a film for a family evening.` into **Context for this request only** and summarize again. With a real model the focus can change; the simulation ignores context.
6. Click **Summarize** and then quickly **Cancel**: the log says `summarize(): cancelled`.

Nice! Click **Check availability** again: in the simulation the badge now says **available**, because the model was downloaded once.

> [!NOTE]
> The type changes only the style. If the source text contains the ending, a teaser can reveal it. Our notes leave endings out on purpose, and the cinema's Story panel sends only the spoiler-free description to the teaser.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 3-1
```

Expected result:

```
  ✔ Step 1 · summaryOptions declares type, length, format and English languages
  ✔ Step 2 · summarizerAvailability asks the browser with the exact options
  ✔ Step 3 · createSummarizer creates with the same options, the signal and a download monitor
  ✔ Step 3 · createSummarizer reports a clear error when the API is missing or unavailable
  ✔ Step 4 · summarize returns the summary, passes context and signal, and destroys the summarizer
  ✔ Step 4 · summarize destroys the summarizer even when summarizing fails

  6 passed, 0 failed
```

Well done! The check runs your file in Node against the simulated AI. It verifies that you call the right APIs with the right options and clean up. It does not judge the quality of a real model's summaries.

### Troubleshooting

| You see                                                   | What to do                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 🧩 `Not implemented yet: exercise 3-1, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                                            |
| `The Summarizer API is not exposed by this browser`       | Use an up-to-date desktop Chrome, check `/preflight`, or turn on **Use simulated browser AI**.                                       |
| Badge **unavailable**                                     | This device cannot summarize with these options. Keep `'en'` as the language; check `/preflight` and `chrome://on-device-internals`. |
| `NotAllowedError` when summarizing                        | The model download needs a user action. Start it from a button click, as the page does.                                              |
| The progress bar stays, or the first summary takes long   | Chrome is downloading the model. Follow the download in `chrome://on-device-internals`.                                              |
| `QuotaExceededError`                                      | The input is too long for this summarizer. Split it as shown in exercise 3.3.                                                        |
| The page did not change after saving                      | Check the app's terminal for a compile error. It names the file and the line.                                                        |

Still stuck? `pnpm lab:solve 3-1` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 3-1` brings back the starter file.

> [!NOTE]
> Open a movie → **Story** in the cinema: it uses the same API with production details. `apps/movie-theater/src/app/ai/summarizer/summarizer.api.ts` checks availability with the same options, attaches a download monitor, streams with `summarizeStreaming()` (exercise 3.2) and calls `destroy()` in `finally`. `apps/movie-theater/src/app/features/notes/movie-summary.service.ts` chooses the source text per type (a teaser gets only the spoiler-free description) and shows a summary of section summaries (exercise 3.3). `apps/movie-theater/src/app/ai/ai.types.ts` holds `englishTaskOptions`, the same language declaration as `englishLanguages`.

## 5. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Add `preference: 'speed'` or `'capability'` to the options (see `PerformancePreference` in the typings). It is a hint to the browser, not a guarantee. Does `availability()` change?
- Change `outputLanguage` to `'es'` or `'ja'` and check availability again. Language support is checked per option set.
- Measure the source first with `summarizer.measureInputUsage(text)` and log it next to `summarizer.inputQuota`. That is the start of exercise 3.3.
