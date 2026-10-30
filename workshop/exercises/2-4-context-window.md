# Exercise 2.4: Managing the context window

A session remembers the conversation, but its memory is finite: every question and every answer takes up room until old turns start to drop out. In this exercise we will keep a conversation inside its context window: show how full it is, check a message before sending it, notice an overflow, branch a conversation and compact it into a short summary.

**Page:** http://127.0.0.1:4200/lab/2-4 · **You edit:** `apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise.ts` · **Check:** `pnpm lab:check 2-4` · **Time:** ~20 min · **Level:** core

## Goal

At the end of this exercise the context meter tells you how full a conversation is, and **Compact** brings it back down: in the simulation, the three suggested questions fill the session to `225 / 4096 tokens (5%)` before **Compact** and `91 / 4096 tokens (2%)` after.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/2-4 in Chrome. If the page says **NO BUILT-IN AI DETECTED**, turn on **Use simulated browser AI**: the simulation counts about four characters as one token and drops old turns when its window is full. If it says **NATIVE**, keep the switch off; native mode uses the window size Chrome reports, so for the overflow in Step 3 you can switch the simulation on for that step only.

Open `exercise.ts`. `promptOptions`, `systemPrompt`, `summaryInstruction`, the three result types and `createSession()` at the top are given. `createSession(extraPrompts)` accepts extra messages to put after the system prompt; Step 5 uses that. You write the five functions below them, each of which still calls `todo('2-4', …)`.

Five terms we will use throughout:

| Term                 | Meaning                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Token**            | The unit a language model reads and writes: a word, part of a word or a punctuation mark. For English, one token is roughly four characters. The exact count depends on the model, so measure instead of guessing. |
| **Context window**   | The most tokens a session can hold at once: system prompt + every question + every answer. `session.contextWindow` is the size, `session.contextUsage` is how much is used.                                        |
| **Overflow**         | What happens when the conversation grows past the window: the session drops its oldest turns to make room and fires a `contextoverflow` event. The model then no longer "knows" those turns.                       |
| **Fork (`clone()`)** | A copy of a session including its whole context. After the copy, the two sessions are independent, like two browser tabs that started from the same page.                                                          |
| **Compaction**       | Replacing a long conversation with a short summary in a new session. It frees space, but it is lossy: anything the summary does not mention is gone.                                                               |

## 1. Show how full the session is

We can't manage what we can't see. Two read-only numbers on every session tell us how full it is: `contextUsage` (tokens used) and `contextWindow` (tokens available in total). The percentage drives the meter on the page.

In `contextStats()`, return `{ used, window, percent }`, with `percent` as a whole number from 0 to 100.

> [!TIP]
> Return `percent: 0` when the window is 0. Dividing by zero gives `NaN` or `Infinity`, and the meter would show `NaN%`.

<details>
  <summary>contextStats() solution</summary>

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

The local variable is called `size`, not `window`: in a browser, `window` already means the global window object.

</details>

Save. Click **Start session**. The column **Original** shows a meter and the token count, in the simulation `42 / 4096 tokens · 1%` (the real model reports its own numbers). Those first tokens are the system prompt. Click **Send** a few times and watch the number grow: every question and every answer stays in the context.

## 2. Measure a message before sending it

Once a message is sent, it is too late to notice it doesn't fit: old turns are already gone. `session.measureContextUsage(text)` returns how many tokens `text` would add, without sending it. Compare that with the free space (`contextWindow - contextUsage`). If it does not fit, the app can warn the user, shorten the text or compact first.

In `measureMessage()`, measure the text, work out the free space and return `{ needed, remaining, fits }`.

> [!WARNING]
> Use only `measureContextUsage()` here; it leaves `contextUsage` unchanged. `prompt()` or `append()` would add the message to the conversation while you only meant to measure it.

> [!TIP]
> Token counts differ per model. Measure with the API instead of counting characters.

<details>
  <summary>measureMessage() solution</summary>

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

Save. Type a question and click **Measure**: you see "This message needs N tokens; M are free" and a **fits** badge. Click **Medium message** and **Measure** again: in the simulation it needs 342 tokens. **Long message** (all programme notes of all movies) needs 976. **Send** now measures first and refuses a message that does not fit; the log explains why.

"Fits" only means the question fits. The answer also needs space, so leave some room in real apps. A message bigger than the whole window cannot be sent at all: `prompt()` rejects with a `QuotaExceededError`.

## 3. Get told when the session overflows

When the conversation no longer fits, the session removes its oldest turns without asking. The `contextoverflow` event is our only signal that the model has forgotten something. A session is an `EventTarget`, so you listen with `addEventListener`, as you would for a click on a button.

In `watchOverflow()`, call `onOverflow` on every `contextoverflow` event. As in exercise 2.2, return a function that removes the listener again, so the page can stop listening before it throws the session away.

<details>
  <summary>watchOverflow() solution</summary>

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

Save. An overflow needs a full window, so let's shrink the window:

1. Turn on **Use simulated browser AI** (if it is not on already).
2. Click **Use a tiny 600-token window (simulation only)**. A new session starts with a 600-token window. This is a simulation setting; a real session's window size is decided by the browser.
3. Click **Medium message** and **Send** (342 simulated tokens). Click **Medium message** again and press **Send**: it is refused, because it no longer fits (Step 2). Now press **Send anyway**. The question is sent, the window overflows, section **D · Overflow events** lists the `contextoverflow` event, and the log says `old turns were dropped`. Nine short questions in a fresh tiny-window session have the same effect.
4. Try **Long message** with **Send anyway**: at 976 tokens it is bigger than the whole 600-token window, so `prompt()` rejects with a `QuotaExceededError` and nothing is sent.

## 4. Fork the conversation

Sometimes a viewer wants to try another direction without losing the current conversation. Asking both in one session puts both threads into the same window. `session.clone()` branches the conversation instead: it creates a new session with a copy of the whole context (system prompt, questions and answers), and from then on each branch has its own context budget. A question in one branch never fills the other.

In `fork()`, return `session.clone()` and pass `{ signal }`, so a fork in progress can be cancelled.

<details>
  <summary>fork() solution</summary>

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

Both sessions use memory, so both must be destroyed in the end; the page does that for you when you restart or leave.

Save. Click **Back to the normal window** (or **Restart session**), ask one question in **Original**, then click **Fork the original** in section **C**. A second column **Fork** appears with the same transcript and the same token count. Now let the branches differ:

1. In **Original**, send **Is it suitable for young kids?**. In **Fork**, send the prefilled **Something funny instead?**. Each meter grows on its own.
2. Type **What did I just ask?** in both columns and send it. Each branch remembers only its own question: in the simulation, the **Original** answer ends with `Earlier you asked: "Is it suitable for young kids?"` and the **Fork** answer with `Earlier you asked: "Something funny instead?"`.

## 5. Compact a long conversation

When a conversation is close to full, we can trade detail for space: replace it with a short summary in a fresh session. Compaction has three parts, and the order matters:

1. Ask the old session for a summary. It still remembers everything, so it is the best one to write it.
2. Create a new session that starts with the system prompt and the summary (as a message with role `user`). The given `createSession(extraPrompts)` does this.
3. Only then destroy the old session.

In `compact()`, run these three parts in order and return `{ session, summary }` with the new session.

> [!WARNING]
> Create the replacement before you call `session.destroy()`. If creating it fails (no model, no space, the user pressed Stop), the user keeps the old, working conversation. Then return the replacement, not the destroyed session.

<details>
  <summary>compact() skeleton</summary>

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

For part 1, prompt the old session with `summaryInstruction` and the `signal`. For part 2, pass `createSession()` one `user` message that starts with `Summary of our earlier conversation (details may be missing):` followed by the summary; the "details may be missing" keeps the model from pretending it remembers more. Part 3 is `session.destroy()`.

<details>
  <summary>compact() solution</summary>

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

| Code                                           | Meaning                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `session.prompt(summaryInstruction, …)`        | The old session writes the summary while it still holds the whole conversation. |
| `createSession([{ role: 'user', … }], signal)` | A new session with the system prompt plus the summary, and nothing else.        |
| `session.destroy()` after `createSession()`    | The old session is released only once its replacement exists.                   |
| `return { session: replacement, summary }`     | The page swaps in the new session and shows the summary it starts with.         |

</details>

Save. With the normal window, click **Restart session** and send the three suggestions in **Original**: **Something atmospheric for tonight?**, **Is it suitable for young kids?** and **What did I ask you first?**. Then click **Compact** in that column. Section **C** shows the token count before and after, and the summary the new session starts with. In the simulation it reads `225 / 4096 tokens (5%)` before and `91 / 4096 tokens (2%)` after. With the native model, write down your own pair:

> Before **Compact** → \_\_\_ tokens · After **Compact** → \_\_\_ tokens

Ask **What did I ask you first?** again: the answer can only use what the summary kept. A summary is lossy: names, numbers and exact wording that are not in it are gone.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 2-4
```

Expected result:

```
  ✔ Step 1 · contextStats reports used tokens, the window and a percentage
  ✔ Step 2 · measureMessage measures without sending and compares with the free space
  ✔ Step 3 · watchOverflow calls back on contextoverflow and can stop listening
  ✔ Step 4 · fork returns an independent copy made with clone()
  ✔ Step 5 · compact summarises, starts a smaller session with the summary and destroys the old one
  ✔ Step 5 · compact keeps the old session when the new one cannot be created

  6 passed, 0 failed
```

Well done! The check runs your file in Node against the simulated AI with its 4-characters-per-token estimate and a 600-token window for the overflow test. Real token counts differ per model; the contract (measure, listen, clone, replace in the right order) is the same.

### Troubleshooting

| You see                                                                    | What to do                                                                                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 2-4, Step N` in the log                  | That function still calls `todo(...)`. Replace the whole line, then save.                                                                    |
| The meter shows `NaN%`                                                     | Step 1 divides by a window of 0. Use `size > 0 ? … : 0`.                                                                                     |
| Measuring makes the token count grow                                       | Use only `measureContextUsage()` in Step 2; `prompt()` and `append()` send the message.                                                      |
| `QuotaExceededError`                                                       | One message is larger than the whole context window. Shorten it; compaction cannot help with a single huge message.                          |
| No overflow events, even with the tiny window                              | Start a new session: the tiny window applies to new sessions, and the button restarts it for you. Check that Step 3 uses `addEventListener`. |
| The tiny-window button is missing                                          | Turn on **Use simulated browser AI**: the button only exists in simulation mode.                                                             |
| After **Compact** the next **Send** logs `The session has been destroyed.` | Return `{ session: replacement, summary }` from Step 5, not the old session.                                                                 |
| The page did not change after saving                                       | Check the app's terminal for a compile error. It names the file and the line.                                                                |

Still stuck? `pnpm lab:solve 2-4` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 2-4` brings back the starter file.

> [!NOTE]
> The cinema app uses the same pattern. In `apps/movie-theater/src/app/features/concierge/concierge-session.service.ts`, `refreshUsage()` matches Step 1, `observe()` Step 3, `clone()` Step 4 (it also destroys a clone that finishes after Stop) and `replace()` Step 5 (build the replacement first). `apps/movie-theater/src/app/features/concierge/concierge.service.ts` → `compact()` writes the summary with the Summarizer API (block 3) instead of the Prompt API. The home-page concierge shows the same context meter with **Fork session**, **Compact history** and **Reset**.

## 6. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Compact automatically: in the page, call `compact()` when `contextStats()` reports more than 80%.
- Keep the last two turns word for word: pass them as extra `user`/`assistant` messages to `createSession()` after the summary. How many tokens does that cost?
- In native mode, compare `contextUsage` right after `createSession()` with the simulation's estimate `systemPrompt.length / 4`. How close is the "four characters per token" rule for the real model?
