# Exercise 2.2: Streaming responses

Show the concierge's answer while the model is still writing it, and add a Stop button.

- **Page:** http://127.0.0.1:4200/lab/2-2
- **You edit:** `apps/movie-theater/src/app/lab/exercises/2-2-streaming/exercise.ts`
- **Check:** `pnpm lab:check 2-2`
- **Time:** ~15 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`createSession()` is given: it is what you wrote in 2.1. You write the three functions below it.

Two things to know:

- A **stream** delivers text in chunks. `stream.getReader()` gives a reader, and `await reader.read()` resolves with `{ value, done }`.
- An **AbortController** cancels work. The Stop button calls `controller.abort()`, and your code gets `controller.signal`.

## 1. Start a streaming answer

In `startStream()`, return `session.promptStreaming(question, { signal })`.

<details>
  <summary>Solution: <code>startStream()</code></summary>

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

## 2. Cancel the reader when the signal aborts

A `read()` that is already waiting can keep waiting after an abort, so we cancel the reader too.

In `cancelOnAbort()`, listen for the signal's `abort` event and call `reader.cancel(signal.reason)`. Return a function that removes the listener.

<details>
  <summary>Hint · skeleton: <code>cancelOnAbort()</code></summary>

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
  <summary>Solution: <code>cancelOnAbort()</code></summary>

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

</details>

## 3. Read the stream chunk by chunk

In `streamAnswer()`:

- Get a reader from `startStream()` and wire it to `cancelOnAbort()`.
- Loop over `reader.read()`. Add each chunk to `text` and call `onText(text)`.
- Stop when `done` is `true` and return the text.
- In `finally`, call `stopListening()` and `reader.releaseLock()`.

> **Warning:** A cancelled reader also reports `done: true`. Call `signal.throwIfAborted()` right after every `read()`.

<details>
  <summary>Hint · skeleton: <code>streamAnswer()</code></summary>

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

<details>
  <summary>Solution: <code>streamAnswer()</code></summary>

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

</details>

### Try it

1. Click **Ask (streaming)**.
   - The text grows word by word.
2. Ask again and press **Stop** quickly.
   - The log shows `streamAnswer(): cancelled`.
3. In section **B**, click **Ask without streaming**.
   - Nothing appears until the whole answer is ready.

Compare **First text after** in section **A** with **The whole answer arrived after** in section **B**. Streaming does not make the model faster. People can start reading sooner.

---

## Check your work

```sh
pnpm lab:check 2-2
```

All 4 checks should pass.

Stuck?

- `pnpm lab:solve 2-2` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 2-2` restores the starter.

| You see                                        | What to do                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| The whole text appears at once                 | Call `onText(text)` inside the loop.                                  |
| Only the last few words are shown              | Append with `text += value`.                                          |
| Stop does nothing                              | Call `cancelOnAbort(reader, signal)` and pass `{ signal }` in Step 1. |
| After Stop the log says `streamAnswer(): done` | Add `signal.throwIfAborted()` right after `reader.read()`.            |
| A `TypeError` about a **locked** stream        | Call `getReader()` once and release the lock in `finally`.            |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `stream()` in `ai/ai-runtime.service.ts` has the same loop.

## Bonus

- Add a time limit: combine the Stop signal with `AbortSignal.timeout(10_000)` using `AbortSignal.any([...])`.
- Count words instead of chunks. Are chunks always whole words with the real model?
