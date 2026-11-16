# Exercise 2.4: Managing the context window

A session's memory is finite. Show how full it is, check a message before sending it, notice an overflow, branch a conversation and shrink it to a summary.

- **Page:** http://127.0.0.1:4200/lab/2-4
- **You edit:** `apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise.ts`
- **Check:** `pnpm lab:check 2-4`
- **Time:** ~20 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`systemPrompt`, `summaryInstruction` and `createSession()` are given. You write the five functions below them.

The **context window** is the most tokens a session can hold: system prompt, every question and every answer. When it is full, the session drops its oldest turns.

## 1. Show how full the session is

In `contextStats()`, return `{ used, window, percent }` from `session.contextUsage` and `session.contextWindow`. `percent` is `Math.round((used / window) * 100)`, and `0` when the window is `0`.

<details>
  <summary>Solution: <code>contextStats()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise.ts
export function contextStats(session: LanguageModel): ContextStats {
  const used = session.contextUsage;
  const size = session.contextWindow;
  return {
    used,
    window: size,
    percent: size > 0 ? Math.round((used / size) * 100) : 0,
  };
}
```

</details>

### Try it

1. Click **Start session**.
   - The **Original** column shows a meter, in the simulation `42 / 4096 tokens · 1%`.
2. Click **Send** a few times and watch it grow.

## 2. Measure a message before sending it

`session.measureContextUsage(text)` says how many tokens `text` would add, without sending it. "Fits" only covers the question. The answer needs room too.

In `measureMessage()`, return `{ needed, remaining, fits }`. `remaining` is `contextWindow - contextUsage`, and `fits` is `needed <= remaining`.

<details>
  <summary>Solution: <code>measureMessage()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise.ts
export async function measureMessage(
  session: LanguageModel,
  text: string,
): Promise<Measurement> {
  const needed = await session.measureContextUsage(text);
  const remaining = session.contextWindow - session.contextUsage;
  return { needed, remaining, fits: needed <= remaining };
}
```

</details>

### Try it

1. Click **Medium message**, then **Measure**.
   - In the simulation it needs 342 tokens.
   - **Send** now refuses a message that does not fit.

## 3. Get told when the session overflows

The session fires a `contextoverflow` event when it drops old turns.

In `watchOverflow()`, call `onOverflow` on every `contextoverflow` event. Return a function that removes the listener.

<details>
  <summary>Solution: <code>watchOverflow()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise.ts
export function watchOverflow(
  session: LanguageModel,
  onOverflow: () => void,
): () => void {
  session.addEventListener('contextoverflow', onOverflow);
  return () => session.removeEventListener('contextoverflow', onOverflow);
}
```

</details>

### Try it (simulation only)

1. Click **Use a tiny 600-token window (simulation only)**.
2. Click **Medium message** and **Send**.
3. Click **Medium message** again and **Send anyway**.
   - Section **D** lists the overflow event.

## 4. Fork the conversation

`session.clone()` copies a session with its whole context. After that, the two are independent.

In `fork()`, return `session.clone({ signal })`.

<details>
  <summary>Solution: <code>fork()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise.ts
export async function fork(
  session: LanguageModel,
  signal?: AbortSignal,
): Promise<LanguageModel> {
  return session.clone({ signal });
}
```

</details>

### Try it

1. Click **Back to the normal window** (or **Restart session** if you did not use the tiny window), ask one question, then click **Fork the original**.
2. Ask a different question in each column, then type _What did I just ask?_ in both.
   - Each branch remembers only its own.

## 5. Compact a long conversation

Replace a long conversation with a short summary in a new session. The order matters:

1. Ask the old session for a summary with `summaryInstruction`.
2. Create a new session with `createSession([{ role: 'user', content: … }], signal)`, where the content is the summary.
3. Only then destroy the old session.

In `compact()`, do these three and return `{ session, summary }` with the new session.

> **Warning:** Create the replacement before you destroy the old session. If creating fails, the user keeps a working conversation.

<details>
  <summary>Hint · skeleton: <code>compact()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise.ts
export async function compact(
  session: LanguageModel,
  signal?: AbortSignal,
): Promise<Compacted> {
  const summary = /* 1. ask the old session for a summary */;
  const replacement = /* 2. a new session seeded with the summary */;
  /* 3. release the old session */
  return /* the new session and the summary */;
}
```

</details>

<details>
  <summary>Solution: <code>compact()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise.ts
export async function compact(
  session: LanguageModel,
  signal?: AbortSignal,
): Promise<Compacted> {
  // 5a · The old session still remembers everything, so it can summarise itself.
  const summary = await session.prompt(summaryInstruction, { signal });

  // 5b · A fresh session that knows only the system prompt and the summary.
  const replacement = await createSession(
    [
      {
        role: 'user',
        content: `Summary of our earlier conversation (details may be missing): ${summary}`,
      },
    ],
    signal,
  );

  // 5c · Only now, when the replacement exists, release the old session.
  session.destroy();
  return { session: replacement, summary };
}
```

</details>

### Try it

1. Click **Restart session**, send the three suggestions, then click **Compact**.
   - In the simulation the count drops from `225` to `91` tokens.
2. Ask **What did I ask you first?** again: the answer can only use what the summary kept.

---

## Check your work

```sh
pnpm lab:check 2-4
```

All 6 checks should pass.

Stuck?

- `pnpm lab:solve 2-4` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 2-4` restores the starter.

| You see                                             | What to do                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| The meter shows `NaN%`                              | Step 1 divides by a window of 0. Return `0` when the window is `0`.       |
| Measuring makes the token count grow                | Use only `measureContextUsage()` in Step 2. `prompt()` sends the message. |
| `QuotaExceededError`                                | One message is larger than the whole window. Shorten it.                  |
| The tiny-window button is missing                   | Turn on **Use simulated browser AI**.                                     |
| After **Compact**: `The session has been destroyed` | Return the replacement from Step 5, not the old session.                  |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `features/concierge/concierge-session.service.ts` has the same meter, fork and compaction.

## Bonus

- Compact automatically when `contextStats()` reports more than 80%.
- Keep the last two turns word for word: pass them to `createSession()` after the summary.
