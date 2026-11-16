# Exercise 3.2: Streaming summaries

Show a summary while the model is still writing it, with a Stop button, and measure the time until the first text.

- **Page:** http://127.0.0.1:4200/lab/3-2
- **You edit:** `apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise.ts`
- **Check:** `pnpm lab:check 3-2`
- **Time:** ~10 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`streamOptions()`, `createSummarizer()` and `summarizeOnce()` are given. You write the three functions below them.

## 1. Read a text stream piece by piece

`stream.getReader()` gives a reader. `await reader.read()` resolves with `{ value, done }`.

In `readText()`:

- Get a reader. Add an `abort` listener on the signal that calls `reader.cancel()`.
- Loop over `reader.read()`. Add each chunk to `text` and call `onText(text)`.
- Stop when `done` is `true` and return the text.
- In `finally`, remove the listener and call `reader.releaseLock()`.

> **Warning:** A cancelled reader also reports `done: true`. Call `signal?.throwIfAborted()` right after every `read()`.

<details>
  <summary>Hint · skeleton: <code>readText()</code></summary>

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

<details>
  <summary>Solution: <code>readText()</code></summary>

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

</details>

### Try it

1. In section **A**, click **Read the demo stream**.
   - A sentence appears word by word.
2. Click again and press **Stop**: the log says `cancelled`.

## 2. Stream a summary

In `summarizeStreaming()`:

- Create a summarizer with `createSummarizer()`.
- In `try`, `return await readText(summarizer.summarizeStreaming(text, { signal }), onText, signal)`.
- In `finally`, destroy the summarizer.

<details>
  <summary>Hint · skeleton: <code>summarizeStreaming()</code></summary>

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
  <summary>Solution: <code>summarizeStreaming()</code></summary>

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

### Try it

Run `pnpm lab:check 3-2`. Both Step 2 lines turn ✔. The page uses this function from Step 3.

## 3. Measure what the viewer feels

Time to first text is how long the viewer looks at an empty box.

In `timedStreaming()`, call `summarizeStreaming()` with a callback that records `firstTextMs` once and then calls `onText`. Return `{ text: result, firstTextMs: firstTextMs ?? totalMs, totalMs }`: an empty stream never delivers a first text.

> **Tip:** `firstTextMs ??= performance.now() - started` assigns only the first time.

<details>
  <summary>Hint · skeleton: <code>timedStreaming()</code></summary>

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
  return /* { text: result, firstTextMs: firstTextMs ?? totalMs, totalMs } */;
}
```

</details>

<details>
  <summary>Solution: <code>timedStreaming()</code></summary>

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

</details>

### Try it

1. In section **B**, click **Streaming only**.
   - The right column fills in while the model writes.
2. Click **Run both** twice.
   - The first run includes the model download.
   - On the second run in the simulation, the one-shot column shows its first text after about 250 ms, the streaming column after about 35 ms.
   - The total time does not shrink.

---

## Check your work

```sh
pnpm lab:check 3-2
```

All 5 checks should pass.

Stuck?

- `pnpm lab:solve 3-2` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 3-2` restores the starter.

| You see                                          | What to do                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| After **Stop**, the demo text keeps growing      | Call `reader.cancel()` from an `abort` listener in `readText()`.      |
| `call reader.releaseLock() in a finally block`   | Release the reader in `finally`.                                      |
| The stream ends early with `cancelled`           | Keep `return await readText(…)` inside `try`.                         |
| Words appear twice (`The The film The film is…`) | Your browser sends the whole text in every chunk. Use `text = value`. |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: the Story panel always streams (`ai/summarizer/summarizer.api.ts`).

## Bonus

- Rewrite Step 1 with `for await (const chunk of stream)`. What happens to cancel and `releaseLock()`?
- Log the number of chunks. Does the model send words or sentences?
