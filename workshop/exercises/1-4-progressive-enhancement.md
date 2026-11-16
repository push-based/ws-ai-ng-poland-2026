# Exercise 1.4: Progressive enhancement

Build a feature that works in every browser first, and uses AI only where the browser can run it.

- **Page:** http://127.0.0.1:4200/lab/1-4
- **You edit:** `apps/movie-theater/src/app/lab/exercises/1-4-progressive-enhancement/exercise.ts`
- **Check:** `pnpm lab:check 1-4`
- **Time:** ~15 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`summaryOptions` is given. You write the three functions below it.

The plan: every movie card gets a short text. Where the Summarizer runs, it is an **AI summary**. Everywhere else it is a **Basic excerpt** made with plain JavaScript. The badge tells the viewer which one they got.

## 1. Can this browser offer the AI version?

In `detectEnhancement()`:

- Return `'basic'` when the `Summarizer` global does not exist.
- Return `'ai'` when `Summarizer.availability(summaryOptions)` is anything but `'unavailable'`.
- Return `'basic'` when the check throws.

> **Warning:** Check `typeof Summarizer === 'undefined'` first. A bare `Summarizer` throws in a browser without the API.

<details>
  <summary>Hint · skeleton: <code>detectEnhancement()</code></summary>

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

<details>
  <summary>Solution: <code>detectEnhancement()</code></summary>

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

### Try it

1. In section **A**, click **Check this browser**: **AI available**.
2. Tick **Pretend this browser has no AI** and click again: **Basic only**.

## 2. The basic version, without AI

The fallback is the first sentences of the programme notes.

In `basicExcerpt()`, split `text` with `text.match(/[^.!?]+[.!?]+/g)`, keep the first `maxSentences`, trim each one and join them with a space. Use `[text]` when `match()` returns `null`.

<details>
  <summary>Solution: <code>basicExcerpt()</code></summary>

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

</details>

### Try it

1. In section **B**, click **Show basicExcerpt()**.
2. Change **Sentences** to `1` and click again.

## 3. AI first, basic always

In `shortDescription()`:

- Try AI only if Step 1 says `'ai'`: create a summarizer with `summaryOptions` plus `signal`, summarize `text` and return `{ source: 'ai', text: summary }`.
- In `catch`, do nothing. Any failure falls through to the baseline.
- In `finally`, destroy the summarizer.
- After the `if`, return `{ source: 'basic', text: basicExcerpt(text, 2) }`.

<details>
  <summary>Hint · skeleton: <code>shortDescription()</code></summary>

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

<details>
  <summary>Solution: <code>shortDescription()</code></summary>

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

### Try it

1. In section **C**, click **Shorten all three**: each card gets an **AI summary** badge.
2. Tick **Pretend this browser has no AI** in section **A** and click again: every card still gets a text, now with a **Basic excerpt** badge.

---

## Check your work

```sh
pnpm lab:check 1-4
```

All 6 checks should pass.

Stuck?

- `pnpm lab:solve 1-4` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 1-4` restores the starter.

| You see                                     | What to do                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `ReferenceError: Summarizer is not defined` | In Step 1, check `typeof Summarizer === 'undefined'` first.                   |
| Always **Basic excerpt**                    | Step 1 returns `'basic'`. Turn on the simulation.                             |
| The excerpt is the whole text               | Copy the regular expression as written: `/[^.!?]+[.!?]+/g`.                   |
| Sentences are glued together                | Join with `' '` (a space).                                                    |
| Native Chrome shows **Basic** after `'ai'`  | The AI call failed and your fallback worked. Log the error in `catch` to see. |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `ai/summarizer/summarizer.api.ts` uses the same options for `availability()` and `create()`, and destroys in `finally`.

## Bonus

- In `catch`, rethrow when `signal?.aborted` is `true`, so a stopped request stays cancelled.
- Make `basicExcerpt()` stop at a word limit instead of a sentence count.
