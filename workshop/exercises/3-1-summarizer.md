# Exercise 3.1: The Summarizer API

Turn a movie's programme notes into a TL;DR, a teaser, key points or a headline. With the Summarizer you pick options from three drop-downs. You do not write a prompt.

- **Page:** http://127.0.0.1:4200/lab/3-1
- **You edit:** `apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise.ts`
- **Check:** `pnpm lab:check 3-1`
- **Time:** ~15 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Its "summaries" are the first sentences of the text. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`programmeNotes()` and `englishLanguages` are given. You write the four functions below them.

Why not the Prompt API? With a task API there is no prompt to write and test, the browser can use a setup made for the job, and it has its own availability check. Use the Prompt API when these options cannot express what you need.

## 1. Describe the summary you want

| Option          | Values                                             |
| --------------- | -------------------------------------------------- |
| `type`          | `'tldr'`, `'teaser'`, `'key-points'`, `'headline'` |
| `length`        | `'short'`, `'medium'`, `'long'`                    |
| `format`        | `'markdown'`, `'plain-text'`                       |
| `sharedContext` | background for every summary, such as the readers  |

In `summaryOptions()`, return `englishLanguages` plus `type`, `length` and `format`. Add `sharedContext` only when it is not empty after trimming.

<details>
  <summary>Solution: <code>summaryOptions()</code></summary>

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

</details>

### Try it

In section **B**, click **Preview summaryOptions()**.

## 2. Check availability with these options

In `summarizerAvailability()`, return `'missing'` when `typeof Summarizer === 'undefined'`. Otherwise return `Summarizer.availability(options)`.

<details>
  <summary>Solution: <code>summarizerAvailability()</code></summary>

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

### Try it

1. Click **Check availability**.
   - A badge appears next to the heading of section B.

## 3. Create a summarizer

In `createSummarizer()`:

- Call `summarizerAvailability()` and throw an `Error` for `'missing'` and `'unavailable'`. For `'missing'`, say that the API is not exposed by this browser.
- Call `Summarizer.create()` with the same options, the `signal` and a `monitor`.
- In the monitor, forward `event.loaded` of each `downloadprogress` event with `onProgress?.(event.loaded)`. `onProgress` is optional.

<details>
  <summary>Hint · skeleton: <code>createSummarizer()</code></summary>

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

<details>
  <summary>Solution: <code>createSummarizer()</code></summary>

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

</details>

## 4. Summarize one text and clean up

In `summarize()`:

- Create a summarizer with `createSummarizer()`.
- In `try`, `return await summarizer.summarize(text, { context, signal })`.
- In `finally`, destroy the summarizer.

`context` is background for this one request. Pass it only when it is not empty after trimming.

> **Warning:** Keep the `await` in `return await`. Without it, `finally` destroys the summarizer while it is still working.

<details>
  <summary>Hint · skeleton: <code>summarize()</code></summary>

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

<details>
  <summary>Solution: <code>summarize()</code></summary>

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

</details>

### Try it

In section **C**, click **Summarize**:

1. **tldr / short / plain-text** gives a short paragraph.
2. **key-points** gives a list. **long** gives more bullets.
3. **headline** gives one line.
4. Click **Summarize**, then quickly **Cancel**: the log says `summarize(): cancelled`.

The page shows Markdown as plain text on purpose. Model output is untrusted, so keep it away from `innerHTML`.

---

## Check your work

```sh
pnpm lab:check 3-1
```

All 6 checks should pass.

Stuck?

- `pnpm lab:solve 3-1` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 3-1` restores the starter.

| You see               | What to do                                                           |
| --------------------- | -------------------------------------------------------------------- |
| Badge **unavailable** | This device cannot summarize with these options. Keep `'en'`.        |
| `QuotaExceededError`  | The input is too long for this summarizer. Exercise 3.3 splits it.   |
| The bar stays visible | Chrome is downloading the model. See `chrome://on-device-internals`. |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: open a movie → **Story** (`ai/summarizer/summarizer.api.ts`).

## Bonus

- Change `outputLanguage` to `'es'` or `'ja'` and check availability again.
- Log `summarizer.measureInputUsage(text)` next to `summarizer.inputQuota`. That is the start of exercise 3.3.
