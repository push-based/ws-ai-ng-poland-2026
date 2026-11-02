# Exercise 1.4: Progressive enhancement

The built-in AI APIs are new, not in every browser, and not on every device, so a feature that needs them would be broken for many viewers. In this exercise we will build a feature that works everywhere first and uses AI only where the browser can do more.

**Page:** http://127.0.0.1:4200/lab/1-4 · **You edit:** `apps/movie-theater/src/app/lab/exercises/1-4-progressive-enhancement/exercise.ts` · **Check:** `pnpm lab:check 1-4` · **Time:** ~15 min · **Level:** core

## Goal

At the end of this exercise every movie card's **Short version** button gives a short text in every browser: with an **AI summary** badge where the Summarizer runs, and with a **Basic excerpt** badge everywhere else.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/1-4 in Chrome. If the page says **NO BUILT-IN AI DETECTED**, turn on **Use simulated browser AI**: your code then runs against a simulated Summarizer, and everything in this exercise still works.

Open `exercise.ts`. `summaryOptions` at the top is given: a short, plain-text `tldr` of English text. You write the three functions below it, each of which still calls `todo('1-4', …)`.

Progressive enhancement means: build the feature so that it works everywhere first (the _baseline_), then make it better where the browser can do more (the _enhancement_). For built-in AI that means:

| Part            | Here                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Baseline**    | "Show a short description of each film", with plain JavaScript only.                                              |
| **Enhancement** | An AI summary, used only where the Summarizer is available. Any AI failure falls back.                            |
| **Honesty**     | The viewer always gets a result, and the badge shows which version they got (**AI summary** / **Basic excerpt**). |

## 1. Can this browser offer the AI version?

The cards need one decision before they do anything: try AI, or go straight to the baseline. We use the same two checks as in exercise 1.2, now to make that decision.

In `detectEnhancement()`, return `'ai'` only when the `Summarizer` global exists and `Summarizer.availability(summaryOptions)` is not `'unavailable'`. `'downloadable'` counts as `'ai'`: the first click starts the download. If the check throws, return `'basic'`, so the baseline keeps working when a check fails.

> [!WARNING]
> Check `typeof Summarizer === 'undefined'` first, before any other line touches `Summarizer`. A bare `Summarizer` in a browser without the API throws `ReferenceError: Summarizer is not defined`.

<details>
  <summary>detectEnhancement() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-4-progressive-enhancement/exercise.ts
export async function detectEnhancement(): Promise<Enhancement> {
  /* 1. no Summarizer global? basic */
  try {
    /* 2. ask availability(summaryOptions); 'unavailable' → basic, else ai */
  } catch {
    /* 3. the check failed: basic */
  }
}
```

</details>

Feature detection is one `if` that returns `'basic'`. Inside `try`, `await Summarizer.availability(summaryOptions)` and map the answer with a ternary. `catch { … }` without `(error)` is fine when you don't need the error.

<details>
  <summary>detectEnhancement() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-4-progressive-enhancement/exercise.ts
export async function detectEnhancement(): Promise<Enhancement> {
  if (typeof Summarizer === 'undefined') return 'basic';
  try {
    const availability = await Summarizer.availability(summaryOptions);
    return availability === 'unavailable' ? 'basic' : 'ai';
  } catch {
    return 'basic';
  }
}
```

</details>

Save. In section **A**, click **Check this browser**. The badge says **AI available** (with the simulation, or in Chrome with a Summarizer). Tick **Pretend this browser has no AI** and click again: **Basic only**. The page hides the `Summarizer` global while your code runs, so your code sees what a browser without the API looks like.

## 2. The basic version, without AI

The baseline has to work with plain JavaScript. A simple, honest fallback is an excerpt: the first sentences of the programme notes.

In `basicExcerpt()`, split `text` into sentences with `text.match(/[^.!?]+[.!?]+/g)`, use `[text]` when `match()` returns `null`, keep the first `maxSentences`, trim each one, and join them with a space. The regular expression means "some characters that are not `.`, `!` or `?`, followed by one or more of them": one sentence. It only matches text that ends in one of those marks, so a last sentence without a closing `.`, `!` or `?` is left out of the excerpt. All three programme notes end with a full stop.

> [!TIP]
> Join with `' '` (a space). `.trim()` removes the spaces between sentences, so a join with `''` glues them together.

<details>
  <summary>basicExcerpt() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-4-progressive-enhancement/exercise.ts
export function basicExcerpt(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences
    .slice(0, maxSentences)
    .map((sentence) => sentence.trim())
    .join(' ');
}
```

| Code                                  | Meaning                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `?? [text]`                           | If `match()` found nothing (`null`), use the whole text as one sentence. |
| `.slice(0, maxSentences)`             | Keep the first `maxSentences` sentences.                                 |
| `.map((sentence) => sentence.trim())` | Remove the spaces between sentences that the regular expression kept.    |
| `.join(' ')`                          | Glue them back together with one space.                                  |

</details>

Save. In section **B**, click **Show basicExcerpt()**: you see the first two sentences of the Sintel programme notes. Change **Sentences** to `1` and click again: one sentence. Set it to `4`: four sentences.

## 3. The feature: AI first, basic always

`shortDescription()` is what the cards call, and it is where the pattern comes together. In `shortDescription()`:

- Try AI only if Step 1 says `'ai'`. Create a summarizer with the same `summaryOptions` you checked plus `signal`, and summarize `text` with `{ signal }`.
- In `catch`, treat any failure (a refused download, input too long, a cancelled request…) as a reason to use the baseline: fall through to it.
- In `finally`, `destroy()` the summarizer whether it worked or not, so the model's memory is released.
- After the `if`, return the baseline: `basicExcerpt(text, 2)`. Every path ends with a result.

> [!WARNING]
> Declare `let summarizer: Summarizer | undefined` before `try`, so `finally` can see it. It starts as `undefined`; if `create()` failed, there is nothing to destroy, and `summarizer?.destroy()` skips the call.

<details>
  <summary>shortDescription() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-4-progressive-enhancement/exercise.ts
export async function shortDescription(
  text: string,
  signal?: AbortSignal,
): Promise<ShortDescription> {
  if (/* Step 1 says 'ai' */) {
    let summarizer: Summarizer | undefined;
    try {
      /* create, summarize, return { source: 'ai', text } */
    } catch {
      /* fall through to basic */
    } finally {
      /* release the summarizer */
    }
  }
  return /* { source: 'basic', text: Step 2's excerpt of two sentences } */;
}
```

</details>

Inside `try`, assign `summarizer = await Summarizer.create({ ...summaryOptions, signal })`, then `await summarizer.summarize(text, { signal })` and return it with `source: 'ai'`. `catch` stays empty apart from a comment. `finally` is one line: `summarizer?.destroy()`.

<details>
  <summary>shortDescription() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-4-progressive-enhancement/exercise.ts
export async function shortDescription(
  text: string,
  signal?: AbortSignal,
): Promise<ShortDescription> {
  // 3a · The enhancement: only where the browser supports it.
  if ((await detectEnhancement()) === 'ai') {
    let summarizer: Summarizer | undefined;
    try {
      summarizer = await Summarizer.create({ ...summaryOptions, signal });
      const summary = await summarizer.summarize(text, { signal });
      return { source: 'ai', text: summary };
    } catch {
      // 3b · Any failure (download, quota, cancel…): fall through to basic.
    } finally {
      summarizer?.destroy();
    }
  }
  // 3c · The baseline: works in every browser.
  return { source: 'basic', text: basicExcerpt(text, 2) };
}
```

</details>

Save. In section **C**:

1. Click **Shorten all three**. Each card gets a short text and an **AI summary** badge. The simulated summarizer keeps the first sentence; native Chrome writes a real summary.
2. Tick **Pretend this browser has no AI** in section **A**, then click **Shorten all three** again. Every card still gets a short version, now with a **Basic excerpt** badge.

Great job! The feature works in both browsers, and the badge says which version the viewer got.

If the Summarizer is still **downloadable**, the first click starts its download, so the first card waits for it. With the simulation freshly on, that is the 1600 ms download plus 250 ms for `summarize()`, and the next cards take 250 ms each. With native Chrome, write down your own:

> First card → \_\_\_ ms · Next card → \_\_\_ ms

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 1-4
```

Expected result:

```
  ✔ Step 1 · detectEnhancement returns 'ai' when the Summarizer can run these options
  ✔ Step 1 · detectEnhancement returns 'basic' when there is no usable Summarizer
  ✔ Step 2 · basicExcerpt keeps the first sentences
  ✔ Step 3 · shortDescription uses the Summarizer where it is available, then destroys it
  ✔ Step 3 · shortDescription falls back to the basic excerpt without AI
  ✔ Step 3 · shortDescription falls back on ANY failure and still cleans up

  6 passed, 0 failed
```

The check runs your file in Node against the simulated Summarizer. It hides the API, makes it unavailable, makes `summarize()` fail with input that is too large, and cancels a request, and each time expects the basic excerpt.

### Troubleshooting

| You see                                                   | What to do                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🧩 `Not implemented yet: exercise 1-4, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                                                              |
| `ReferenceError: Summarizer is not defined`               | In Step 1, check `typeof Summarizer === 'undefined'` first, before anything else touches `Summarizer`.                                                 |
| Always **Basic excerpt**, even without the pretend box    | Step 1 returns `'basic'`. Turn on the simulation, or check in exercise 1.2 that your Chrome exposes `Summarizer`.                                      |
| The excerpt is the whole notes text                       | Your regular expression found no sentences. Copy it as written: `/[^.!?]+[.!?]+/g`.                                                                    |
| Sentences are glued together without spaces               | Join with `' '` (a space).                                                                                                                             |
| Native Chrome shows **Basic** although Step 1 said AI     | `create()` or `summarize()` failed and your fallback worked. To see why, temporarily write `catch (error) { console.warn(error); }` and open DevTools. |
| The page did not change after saving                      | Check the app's terminal for a compile error. It names the file and the line.                                                                          |

Still stuck? `pnpm lab:solve 1-4` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 1-4` brings back the starter file.

> [!NOTE]
> The cinema app uses the same building blocks. `apps/movie-theater/src/app/ai/summarizer/summarizer.api.ts` passes the same options to `availability()` and `create()`, and calls `destroy()` in `finally`. `apps/movie-theater/src/app/features/notes/movie-summary.service.ts` builds the **Story** panel's full summary from the notes. The root `README.md` → _Native AI versus fixtures_ shows another choice: the cinema shows a failed native call as an error, and the viewer picks **Fixtures** on purpose, instead of a silent switch to canned text. Both are honest, because both tell the viewer which version they see.

## 4. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Let a cancelled request stay cancelled: in `catch`, rethrow when `signal?.aborted` is `true`, so a stopped request shows as cancelled instead of the excerpt.
- Make `basicExcerpt()` stop at a word limit (for example 40 words) instead of a sentence count.
- Use `summarizeStreaming()` (exercise 3.2) so the AI version appears word by word, while the basic excerpt is shown as a placeholder from the first moment.
