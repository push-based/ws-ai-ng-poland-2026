# Exercise 2.2: Streaming responses

In exercise 2.1, `prompt()` kept the viewer waiting until the whole answer was ready. In this exercise we will show the concierge's answer while the model is still writing it, and give the viewer a Stop button that ends it at any moment.

**Page:** http://127.0.0.1:4200/lab/2-2 · **You edit:** `apps/movie-theater/src/app/lab/exercises/2-2-streaming/exercise.ts` · **Check:** `pnpm lab:check 2-2` · **Time:** ~15 min · **Level:** core

## Goal

At the end of this exercise **Ask (streaming)** shows the answer growing word by word, the first words appear in a fraction of the one-shot wait, and **Stop** freezes the text with `streamAnswer(): cancelled` in the log.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/2-2 in Chrome. If the page says **NO BUILT-IN AI DETECTED**, turn on **Use simulated browser AI**: the simulation streams its answer word by word, so everything in this exercise works the same way.

Open `exercise.ts`. `promptOptions`, `systemPrompt` and `createSession()` at the top are given: `createSession()` is the routine you wrote in exercise 2.1. You write the three functions below them, each of which still calls `todo('2-2', …)`.

Three terms we will use throughout:

| Term                | Meaning                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ReadableStream**  | Data that arrives over time, in pieces called _chunks_. You read it chunk by chunk.                                                                                            |
| **Reader**          | `stream.getReader()` returns one. `await reader.read()` resolves with `{ value, done }`. While you hold a reader the stream is _locked_; `reader.releaseLock()` gives it back. |
| **AbortController** | Cancels async work. You hand `controller.signal` to the work, and `controller.abort()` cancels it. The page's Stop button calls `abort()`; your code listens to the signal.    |

## 1. Start a streaming answer

`session.prompt()` resolves once, with the whole answer. Its streaming twin, `session.promptStreaming()`, returns a `ReadableStream<string>` right away and the model writes into it while it works.

In `startStream()`, return the stream from `session.promptStreaming()`. Pass `{ signal }` as the second argument so that Stop cancels the model's work, not only our reading.

<details>
  <summary>startStream() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-2-streaming/exercise.ts
export function startStream(
  session: LanguageModel,
  question: string,
  signal: AbortSignal,
): ReadableStream<string> {
  return session.promptStreaming(question, { signal });
}
```

</details>

Save and run `pnpm lab:check 2-2` in a second terminal. The `Step 1 · startStream calls promptStreaming() with the question and the signal` line turns ✔. On the page, **Ask (streaming)** still shows a 🧩 hint for Step 3: the page only calls `streamAnswer()`, and nothing reads the stream yet.

## 2. Cancel the reader when the signal aborts

Aborting the model request alone isn't always enough: a `reader.read()` that is already waiting can keep waiting. So when the signal aborts, we also cancel the reader. `reader.cancel()` ends the stream on our side, and a waiting `read()` returns at once with `done: true`.

In `cancelOnAbort()`, listen for the signal's `abort` event and call `reader.cancel()` from it. Return a function that removes the listener again, so a Stop click after the answer is complete leaves the reader alone.

> [!TIP]
> `reader.cancel()` returns a promise that rejects when the stream has already failed. Attach `.catch(() => undefined)` to it so a late Stop stays quiet instead of logging an unhandled rejection.

<details>
  <summary>cancelOnAbort() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-2-streaming/exercise.ts
export function cancelOnAbort(
  reader: ReadableStreamDefaultReader<string>,
  signal: AbortSignal,
): () => void {
  const cancel = () => {
    /* cancel the reader, ignore a failed cancel */
  };
  /* run cancel once, on 'abort' */
  return () => {
    /* stop listening */
  };
}
```

</details>

<details>
  <summary>cancelOnAbort() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-2-streaming/exercise.ts
export function cancelOnAbort(
  reader: ReadableStreamDefaultReader<string>,
  signal: AbortSignal,
): () => void {
  const cancel = () => {
    // cancel() returns a promise. We do not need its result, but it must not
    // become an "unhandled rejection" if the stream has already failed.
    reader.cancel(signal.reason).catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  return () => signal.removeEventListener('abort', cancel);
}
```

| Code                                                       | Meaning                                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `signal.addEventListener('abort', cancel, { once: true })` | Run `cancel` when `controller.abort()` is called. `once: true` removes the listener after one run. |
| `reader.cancel(signal.reason)`                             | End the stream. `signal.reason` is what `abort()` was called with (an `AbortError` by default).    |
| `return () => signal.removeEventListener(...)`             | The clean-up function: once it ran, an abort no longer touches this reader.                        |

</details>

Run `pnpm lab:check 2-2` again: `Step 2 · cancelOnAbort cancels the reader on abort, and its cleanup function stops listening` turns ✔. The page uses this function from Step 3 onwards.

## 3. Read the stream chunk by chunk

Reading a stream is a loop: wait for a chunk, use it, repeat until `done` is `true`. Each chunk is the next few words, so we append it to the text so far and hand the whole text to the page with `onText(text)`.

In `streamAnswer()`, get a reader from `startStream()`, wire it to `cancelOnAbort()`, and loop over `reader.read()` until the stream is done. Return the full text, and clean up in `finally`.

> [!WARNING]
> A cancelled reader also reports `done: true`, which looks exactly like a finished answer. Call `signal.throwIfAborted()` right after every `read()`, before checking `done`, so a stopped answer rejects with an `AbortError` and the page logs it as cancelled.

<details>
  <summary>streamAnswer() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-2-streaming/exercise.ts
export async function streamAnswer(
  session: LanguageModel,
  question: string,
  onText: (textSoFar: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const reader = /* Step 1's stream */.getReader();
  const stopListening = /* Step 2, for this reader */;
  let text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      /* 1. stopped?  2. finished?  3. grow the text and show it */
    }
    return text;
  } finally {
    /* stop listening, release the reader */
  }
}
```

</details>

Fill in the loop body in three lines: throw if the signal aborted, `break` when `done`, then `text += value` and `onText(text)`. In `finally`, call `stopListening()` and `reader.releaseLock()`; `finally` runs after success, after an error and after Stop alike.

<details>
  <summary>streamAnswer() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-2-streaming/exercise.ts
export async function streamAnswer(
  session: LanguageModel,
  question: string,
  onText: (textSoFar: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const reader = startStream(session, question, signal).getReader();
  const stopListening = cancelOnAbort(reader, signal);
  let text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      // A cancelled reader reports done: true. Turn that into an AbortError,
      // so the caller can tell "the user stopped it" from "the answer is complete".
      signal.throwIfAborted();
      if (done) break;
      text += value;
      onText(text);
    }
    return text;
  } finally {
    stopListening();
    reader.releaseLock();
  }
}
```

| Code                                          | Meaning                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `const { value, done } = await reader.read()` | Wait for the next chunk. `value` is the new text; `done` says the stream ended.  |
| `signal.throwIfAborted()`                     | Does nothing normally. After Stop, throws the `AbortError` stored in the signal. |
| `text += value; onText(text);`                | Grow the answer and show it, once per chunk.                                     |
| `finally { stopListening(); … }`              | Clean up in every case, so no listener or lock is left behind.                   |

</details>

Save, let the page reload, and try it:

1. Click **Ask (streaming)**. The text grows word by word, and the table below it fills in **Chunks received**, **First text after** and **Complete after**.
2. Pick **Describe each of your three films for a film club newsletter.**, click **Ask (streaming)** and press **Stop** while the text is still growing. Be quick: in the simulation the whole answer takes only about a second. The text stops growing, the table says "stopped after … ms", and the log shows `streamAnswer(): cancelled`.
3. In section **B**, click **Ask without streaming** with the same question. Nothing appears until the whole answer is ready.

Now compare the numbers. In the simulation, streaming shows its first text after about 35 ms (one simulated word), while the one-shot answer appears after about 250 ms. With the native model, write down your own pair:

> First text (streaming) → \_\_\_ ms · Answer visible (one-shot) → \_\_\_ ms

The total time doesn't drop: streaming doesn't make the model faster, it lets people start reading sooner. The simulation uses fixed delays (35 ms per word, 250 ms per one-shot answer), so there a long streamed answer even finishes later than the one-shot one; only the native pair tells you about real latency. Both sections share one session, so earlier questions stay in the conversation; **New session** starts clean.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 2-2
```

Expected result:

```
  ✔ Step 1 · startStream calls promptStreaming() with the question and the signal
  ✔ Step 2 · cancelOnAbort cancels the reader on abort, and its cleanup function stops listening
  ✔ Step 3 · streamAnswer reports growing text after every chunk and returns the whole answer
  ✔ Step 3 · Stop: streamAnswer rejects with AbortError, cancels the reader and releases it

  4 passed, 0 failed
```

Well done! The last check uses a fake model that ignores the abort signal and never finishes on its own, so only your `reader.cancel()` can end it. The check verifies the code's contract, not the quality of a real model's answers.

### Troubleshooting

| You see                                                     | What to do                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 2-2, Step N` in the log   | That function still calls `todo(...)`. Replace the whole line, then save.                                   |
| The whole text appears at once, at the end                  | Call `onText(text)` inside the loop, after every chunk.                                                     |
| Only the last few words are shown                           | Append with `text += value`.                                                                                |
| Stop does nothing, the text keeps growing                   | Check that `streamAnswer` calls `cancelOnAbort(reader, signal)` and that `startStream` passes `{ signal }`. |
| After Stop the log says `streamAnswer(): done`              | Add `signal.throwIfAborted()` right after `reader.read()`.                                                  |
| A `TypeError` that mentions a stream **locked** to a reader | Call `getReader()` once per stream, and release the lock in `finally`.                                      |
| `The Prompt API is not exposed by this browser`             | Use desktop Chrome, check `/preflight`, or turn on **Use simulated browser AI**.                            |
| The page did not change after saving                        | Check the app's terminal for a compile error. It names the file and the line.                               |

Still stuck? `pnpm lab:solve 2-2` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 2-2` brings back the starter file.

> [!NOTE]
> The cinema app uses the same pattern. In `apps/movie-theater/src/app/ai/ai-runtime.service.ts`, `stream()` has the same loop, cancel-on-abort listener and `releaseLock()` in `finally`, and `run()` shows how `AbortSignal.any()` combines the viewer's Stop with another caller's signal. `apps/movie-theater/src/app/features/concierge/concierge.service.ts` → `recommend()` streams the explanation into the page, then asks for structured data (exercise 2.3).

## 4. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Show a blinking cursor at the end of the text while `streaming()` is true: a class binding in `page.html` plus a few lines of CSS.
- Add a time limit: combine the Stop signal with `AbortSignal.timeout(10_000)` using `AbortSignal.any([...])`, and pass the combined signal to `streamAnswer`.
- Count words instead of chunks. Are chunks always whole words with the real model?
