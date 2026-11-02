# Exercise 3.2: Streaming summaries

In exercise 3.1, `summarize()` showed nothing until the whole summary was ready. In this exercise we will show the summary while the model is still writing it, with a working Stop button, and measure the time that viewers feel: the time until the first text.

**Page:** http://127.0.0.1:4200/lab/3-2 · **You edit:** `apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise.ts` · **Check:** `pnpm lab:check 3-2` · **Time:** ~10 min · **Level:** core

## Goal

At the end of this exercise **Run both** shows the streamed summary growing word by word next to the one-shot version, and the streaming column reports a shorter **First text after … ms** than the one-shot column.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/3-2 in Chrome. If the page says **NATIVE**, keep **Use simulated browser AI** off and use the real Summarizer. If it says **NO BUILT-IN AI DETECTED**, turn the switch on: the simulation streams one word every 35 ms, and your code works the same way.

Open `exercise.ts`. Three functions at the top are given and complete: `streamOptions()` (key points, plain text), `createSummarizer()` (what you wrote in exercise 3.1) and `summarizeOnce()` (the one-shot version). You write the three functions below them, each of which still calls `todo('3-2', …)`.

The stream vocabulary we will use:

| Term                   | Meaning                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **ReadableStream**     | `summarizeStreaming()` returns one instead of a string. It hands out pieces of text (_chunks_) as soon as they exist. |
| **Reader**             | `stream.getReader()` returns one and locks the stream, so nobody else reads it at the same time.                      |
| `await reader.read()`  | Waits for the next chunk and resolves with `{ value, done }`. When `done` is `true`, the stream is finished.          |
| `reader.cancel()`      | Stops the stream. We call it on **Stop**: aborting the request alone can leave `read()` waiting.                      |
| `reader.releaseLock()` | Gives the stream back. We call it in `finally`, so it happens on success, on errors and on Stop.                      |

## 1. Read a text stream piece by piece

Current Chrome sends each chunk as new text (the cinema app relies on this), so we add every chunk to the text we already have and hand the text so far to the page.

In `readText()`, get a reader, cancel it when the signal aborts, and loop over `reader.read()` until the stream is done, calling `onText(text)` after each chunk. Return the complete text, and remove the listener and release the lock in `finally`.

> [!WARNING]
> A cancelled reader reports `done: true`, the same as a finished stream. Call `signal?.throwIfAborted()` right after every `read()`, before checking `done`, so Stop rejects with an `AbortError` and the log shows `cancelled`.

<details>
  <summary>readText() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise.ts
export async function readText(
  stream: ReadableStream<string>,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = stream.getReader();
  const cancel = () => {
    /* cancel the reader, ignore a failed cancel */
  };
  /* run cancel once, on 'abort' */
  let text = '';
  try {
    while (true) {
      /* 1. stopped?  2. read  3. stopped?  4. finished?  5. grow the text and show it */
    }
    return text;
  } finally {
    /* stop listening, release the reader */
  }
}
```

</details>

In `cancel`, call `reader.cancel(signal?.reason).catch(() => undefined)` and register it with `signal?.addEventListener('abort', cancel, { once: true })`. The loop body throws if the signal aborted, awaits `reader.read()`, throws again if aborted, `break`s on `done`, then runs `text += value` and `onText(text)`. In `finally`, remove the listener and call `reader.releaseLock()`.

<details>
  <summary>readText() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise.ts
export async function readText(
  stream: ReadableStream<string>,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = stream.getReader();
  // Aborting the request alone may leave read() waiting: cancel the reader too.
  const cancel = () => {
    reader.cancel(signal?.reason).catch(() => undefined);
  };
  signal?.addEventListener('abort', cancel, { once: true });
  let text = '';
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      text += value;
      onText(text);
    }
    return text;
  } finally {
    // Runs on success, on errors and on Stop: the stream is never left locked.
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}
```

| Code                                           | Meaning                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `signal?.addEventListener('abort', cancel, …)` | When the signal aborts, run `cancel`. `{ once: true }` removes the listener after it ran once.              |
| `.catch(() => undefined)`                      | `cancel()` returns a promise. We don't need its result, and we don't want an "unhandled rejection" warning. |
| `signal?.throwIfAborted()`                     | Throws an `AbortError` if the user pressed Stop. The page's log shows it as `cancelled`.                    |
| `while (true) { … if (done) break; … }`        | Read until the stream says it is finished.                                                                  |
| `onText(text)`                                 | Tell the page the text so far, so it can redraw.                                                            |

</details>

Save. In section **A**, click **Read the demo stream**: a sentence appears word by word. Click it again and press **Stop** half-way: the text stops growing and the log says `cancelled`. No AI is involved yet; this demo stream is plain JavaScript.

## 2. Stream a summary

Streaming a summary follows the same pattern as the given `summarizeOnce()`, with two changes: call `summarizeStreaming()` instead of `summarize()`, and read the stream with your `readText()`.

In `summarizeStreaming()`, create a summarizer with `createSummarizer()`, start `summarizeStreaming(text, { signal })`, read it with `readText()`, and destroy the summarizer in `finally`.

> [!WARNING]
> Keep `return await readText(…)` inside `try`. The summarizer must be destroyed after the whole stream was read; without `await`, `finally` destroys it mid-stream.

<details>
  <summary>summarizeStreaming() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise.ts
export async function summarizeStreaming(
  text: string,
  options: SummarizerCreateOptions,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const summarizer = /* the given createSummarizer() */;
  try {
    const stream = /* start the streaming summary, with the signal */;
    /* return await Step 1 on this stream */
  } finally {
    /* release the model */
  }
}
```

</details>

<details>
  <summary>summarizeStreaming() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise.ts
export async function summarizeStreaming(
  text: string,
  options: SummarizerCreateOptions,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const summarizer = await createSummarizer(options, signal);
  try {
    const stream = summarizer.summarizeStreaming(text, { signal });
    return await readText(stream, onText, signal);
  } finally {
    summarizer.destroy();
  }
}
```

</details>

Save. In section **B**, click **Streaming only**. The right column fills in while the model writes.

## 3. Measure what the viewer feels

Two numbers matter to a viewer:

- Time to first text: how long the viewer stares at an empty box.
- Total time: until the summary is complete. Streaming doesn't make the model faster, so it does not shrink this number.

`performance.now()` returns a precise time in milliseconds. We note the start, wrap `onText` to note the moment the first text arrives, and note the end.

In `timedStreaming()`, call `summarizeStreaming()` with a new callback that records `firstTextMs` once and then calls the page's `onText`. Return `{ text, firstTextMs, totalMs }`.

> [!TIP]
> `firstTextMs ??= performance.now() - started` assigns only the first time, while `firstTextMs` is still `undefined`.

<details>
  <summary>timedStreaming() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise.ts
export async function timedStreaming(
  text: string,
  options: SummarizerCreateOptions,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<StreamTiming> {
  const started = performance.now();
  let firstTextMs: number | undefined;
  const result = await summarizeStreaming(
    text,
    options,
    (textSoFar) => {
      /* note the first time, then pass the text on */
    },
    signal,
  );
  const totalMs = /* time since started */;
  return /* { text, firstTextMs, totalMs } */;
}
```

</details>

The callback has two lines: `firstTextMs ??= performance.now() - started` and `onText(textSoFar)`. When returning, use `firstTextMs ?? totalMs`: an empty stream never delivered any text.

<details>
  <summary>timedStreaming() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise.ts
export async function timedStreaming(
  text: string,
  options: SummarizerCreateOptions,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<StreamTiming> {
  const started = performance.now();
  let firstTextMs: number | undefined;
  const result = await summarizeStreaming(
    text,
    options,
    (textSoFar) => {
      // ??= assigns only once: the first time, while firstTextMs is still undefined.
      firstTextMs ??= performance.now() - started;
      onText(textSoFar);
    },
    signal,
  );
  const totalMs = performance.now() - started;
  return { text: result, firstTextMs: firstTextMs ?? totalMs, totalMs };
}
```

| Code                     | Meaning                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `(textSoFar) => { … }`   | A new callback that does one extra thing (note the first time), then calls the page's `onText`. |
| `firstTextMs ??= …`      | Assign only while `firstTextMs` is still `undefined`.                                           |
| `firstTextMs ?? totalMs` | Covers an empty stream, where no text ever arrived.                                             |

</details>

Save. Keep **Length** on **long** (the default) and click **Run both**. The page runs the one-shot call first, then yours (never both at once: they share one device). Under each column you see `First text after … ms · done after … ms`.

- One-shot: both numbers are the same. Nothing was visible until the end.
- Streaming: the first number is the time until the first word arrived.

In the simulation, `summarize()` waits 250 ms before it resolves, while the stream delivers its first word after 35 ms. So the one-shot column shows its first text after about 250 ms and the streaming column after about 35 ms. With the native model, write down your own pair:

> First text (streaming) → \_\_\_ ms · First text (one-shot) → \_\_\_ ms

Great job! Run it twice: the first run can include creating the summarizer or downloading the model (1600 ms in the simulation). The simulated delays are invented, so compare real timings only on a native device.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 3-2
```

Expected result:

```
  ✔ Step 1 · readText adds up the chunks, reports progress and releases the lock
  ✔ Step 1 · readText stops a waiting stream when the signal aborts
  ✔ Step 2 · summarizeStreaming streams the summary and destroys the summarizer
  ✔ Step 2 · summarizeStreaming destroys the summarizer after Stop
  ✔ Step 3 · timedStreaming reports time to first text and total time

  5 passed, 0 failed
```

The check runs your file in Node against the simulated AI, including a stream that never ends, to prove that Stop cancels the reader.

### Troubleshooting

| You see                                                                     | What to do                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 🧩 `Not implemented yet: exercise 3-2, Step N` in the log                   | That function still calls `todo(...)`. Replace the whole line, then save.                                    |
| After **Stop**, the demo text keeps growing                                 | Call `reader.cancel()` from an `addEventListener('abort', …)` listener in `readText()`.                      |
| The check says `call reader.releaseLock() in a finally block`               | Release the reader with `reader.releaseLock()` in `finally`, so it also runs after errors and Stop.          |
| Native: the stream ends early and the log says `cancelled` without **Stop** | Keep `return await readText(…)` inside `try`, so the summarizer is destroyed after the stream was read.      |
| Words appear twice (`The The film The film is…`)                            | Your browser sent the whole text so far in every chunk. Use `text = value` instead of `text += value` there. |
| `The Summarizer API is not exposed by this browser`                         | Use desktop Chrome, check `/preflight`, or turn on **Use simulated browser AI**.                             |

Still stuck? `pnpm lab:solve 3-2` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 3-2` brings back the starter file.

> [!NOTE]
> The cinema app uses the same pattern. In `apps/movie-theater/src/app/ai/ai-runtime.service.ts`, `stream()` has the same reader loop with cancel-on-abort and `releaseLock()` in `finally`; the cinema uses it for the Prompt API, the Summarizer, the Writer and the Rewriter. In `apps/movie-theater/src/app/ai/summarizer/summarizer.api.ts`, the Story panel always streams its summaries.

## 4. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Show a blinking cursor at the end of the streamed text while `running()` is true.
- `ReadableStream` is also _async iterable_ in current browsers: rewrite Step 1 with `for await (const chunk of stream)`. What happens to cancel and `releaseLock()`?
- Log the number of chunks and the average chunk size. Is the model sending words, sentences or something else?
