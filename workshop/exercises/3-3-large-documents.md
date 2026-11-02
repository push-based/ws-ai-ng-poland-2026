# Exercise 3.3: Summarizing documents larger than the context

On-device models accept only a limited amount of input at once. In this exercise we will measure a long document, split it into chunks that fit, summarize each chunk, and combine the results into one final summary. This technique is called map-reduce, or summary of summaries.

**Page:** http://127.0.0.1:4200/lab/3-3 · **You edit:** `apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts` · **Check:** `pnpm lab:check 3-3` · **Time:** ~20 min · **Level:** core

## Goal

At the end of this exercise **Summarize the whole document** turns a document that is too large for one call into one final summary, with a trace of the rounds and chunks it took to get there.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/3-3 in Chrome. If the page says **NATIVE**, keep **Use simulated browser AI** off and use the real Summarizer. If it says **NO BUILT-IN AI DETECTED**, turn the switch on: the simulated summarizer has a real limit (1024 tokens, or 300 with the tiny-quota option) and fails with `QuotaExceededError` above it, like the browser.

Open `exercise.ts`. Given at the top: `longDocument` (all notes and dialogue of our three movies), `chunkOptions` and `finalOptions`, two constants (`charsPerToken`, `maxRounds`), and three helpers: `createSummarizer()`, `sentencesOf()` and `pack()`. Read `pack()` once: Step 2 uses it three times. You write the four functions below them, each of which still calls `todo('3-3', …)`.

Two terms we will use throughout:

| Term             | Meaning                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Token**        | Models don't read characters, they read tokens: pieces of words. In English one token is about four characters on average, but it depends on the text and on the model.                                                               |
| **`inputQuota`** | The most tokens a summarizer accepts in one call. Above it, `summarize()` fails with a `QuotaExceededError`. `summarizer.measureInputUsage(text)` asks the model how many tokens this text costs, so you measure instead of guessing. |

> [!TIP]
> Chrome's real quota may be large enough for our whole document. Keep **Simulate a tiny quota of 300 tokens** checked to watch the chunking: the page passes it to your code as `quotaOverride`.

## 1. Check whether the text fits

Before we split anything, we need to know whether we have to. We measure the text, compare it with the quota, and return all three numbers so the page can draw a meter.

In `fitsInQuota()`, measure the text with `summarizer.measureInputUsage(text, { signal })` and return `{ usage, quota, fits }`. The `quota = summarizer.inputQuota` in the signature is a default parameter: when the caller gives no quota, the real one is used.

<details>
  <summary>fitsInQuota() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts
export async function fitsInQuota(
  summarizer: Summarizer,
  text: string,
  quota = summarizer.inputQuota,
  signal?: AbortSignal,
): Promise<InputBudget> {
  // measureInputUsage() counts tokens the way this model does. Never guess from characters.
  const usage = await summarizer.measureInputUsage(text, { signal });
  return { usage, quota, fits: usage <= quota };
}
```

</details>

Save. Keep **Simulate a tiny quota** checked and click **Measure the document** in section **B**. You see **Too large** and a meter such as `1080 of 300 tokens` (the simulation counts characters ÷ 4; a real model gives its own number). The log also shows the summarizer's real `inputQuota`. Uncheck the tiny quota and measure again: the simulation shows `1080 of 1024 tokens`, still too large; a native device shows its own quota.

Then click **Summarize in one call (no chunking)**. In the simulation the log shows a `QuotaExceededError`: the document is too large for one call. On a native device with a large quota it may work: a pretend quota only changes what your code decides.

## 2. Split the text into chunks

Where you cut matters: a cut in the middle of a sentence gives the model half a thought. So we cut at the most natural boundary that still fits:

1. Paragraphs (separated by a blank line) when they fit.
2. A paragraph that is too long falls back to sentences.
3. A sentence that is still too long falls back to groups of whole words.

Then `pack()` puts neighbouring pieces together, so each chunk is as full as possible without going over `maxChars`. Fewer, fuller chunks mean fewer model calls.

In `splitIntoChunks()`, split the text into paragraphs, turn each paragraph that is too long into packed sentences (and each sentence that is too long into packed words), and pack all pieces into chunks of at most `maxChars`.

> [!WARNING]
> Build every chunk with `pack()` on whole sentences or whole words, so every chunk ends on a word boundary. A `text.slice(0, maxChars)` cuts words in half.

<details>
  <summary>splitIntoChunks() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts
export function splitIntoChunks(text: string, maxChars: number): string[] {
  // 2a · Paragraphs are the natural boundaries: a blank line separates them.
  const paragraphs = /* split at blank lines, trim, drop empty ones */;

  // 2b · Keep a paragraph whole when it fits; otherwise fall back to sentences,
  //      and for a very long sentence to groups of whole words.
  const pieces = paragraphs.flatMap((paragraph) => {
    if (/* the paragraph fits */) return [paragraph];
    const sentences = /* sentencesOf(paragraph), long sentences packed as words */;
    return /* pack the sentences */;
  });

  // 2c · Put neighbouring pieces together, so each chunk is as full as possible.
  return /* pack the pieces */;
}
```

</details>

Split with `text.split(/\n\s*\n/)`, then `.map((paragraph) => paragraph.trim()).filter(Boolean)`. For a long paragraph, `flatMap` over `sentencesOf(paragraph)`: keep a sentence that fits as `[sentence]`, otherwise `pack(sentence.split(/\s+/), ' ', maxChars)`. Pack the sentences with `' '` as separator, and the final pieces with `'\n\n'`.

<details>
  <summary>splitIntoChunks() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts
export function splitIntoChunks(text: string, maxChars: number): string[] {
  // 2a · Paragraphs are the natural boundaries: a blank line separates them.
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // 2b · Keep a paragraph whole when it fits; otherwise fall back to sentences,
  //      and for a very long sentence to groups of whole words.
  const pieces = paragraphs.flatMap((paragraph) => {
    if (paragraph.length <= maxChars) return [paragraph];
    const sentences = sentencesOf(paragraph).flatMap((sentence) =>
      sentence.length <= maxChars
        ? [sentence]
        : pack(sentence.split(/\s+/), ' ', maxChars),
    );
    return pack(sentences, ' ', maxChars);
  });

  // 2c · Put neighbouring pieces together, so each chunk is as full as possible.
  return pack(pieces, '\n\n', maxChars);
}
```

| Code                               | Meaning                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.split(/\n\s*\n/)`                | Split at a blank line (a line break, optional spaces, another line break).                          |
| `.filter(Boolean)`                 | Drop empty strings.                                                                                 |
| `flatMap(…)`                       | Like `map`, but each paragraph may become several pieces; the results are flattened into one array. |
| `sentencesOf(paragraph)`           | Given helper: the browser's `Intl.Segmenter` splits text into sentences.                            |
| `pack(parts, separator, maxChars)` | Given helper: joins neighbours with `separator` while the group stays within `maxChars`.            |

</details>

Save. In section **C**, click **Split the document** (limit 900). The table lists a few chunks, each at most 900 characters, each starting and ending at a paragraph boundary. Change the limit to **150** and split again: now long paragraphs are cut between sentences.

## 3. Summarize every chunk (map)

Map means: do the same thing to every item. We summarize the chunks one after the other with the same summarizer, so the summaries come back in the order of the chunks and the device runs one model call at a time.

In `summarizeEach()`, loop over the chunks, summarize each with `summarizer.summarize(chunk, { signal })`, report it with `onStage({ name: 'Chunk 2 of 6', detail: summary })`, and return the summaries in order. Call `signal?.throwIfAborted()` at the start of every iteration, so Stop takes effect between chunks.

<details>
  <summary>summarizeEach() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts
export async function summarizeEach(
  summarizer: Summarizer,
  chunks: string[],
  onStage: (stage: Stage) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  const summaries: string[] = [];
  for (const [index, chunk] of chunks.entries()) {
    /* 1. stopped?  2. summarize the chunk  3. keep it  4. report "Chunk N of M" */
  }
  return summaries;
}
```

</details>

`chunks.entries()` gives `[index, chunk]` pairs, so the name is `` `Chunk ${index + 1} of ${chunks.length}` ``.

<details>
  <summary>summarizeEach() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts
export async function summarizeEach(
  summarizer: Summarizer,
  chunks: string[],
  onStage: (stage: Stage) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  const summaries: string[] = [];
  for (const [index, chunk] of chunks.entries()) {
    signal?.throwIfAborted();
    const summary = await summarizer.summarize(chunk, { signal });
    summaries.push(summary);
    onStage({
      name: `Chunk ${index + 1} of ${chunks.length}`,
      detail: summary,
    });
  }
  return summaries;
}
```

</details>

Run `pnpm lab:check 3-3` in a second terminal: `Step 3 · summarizeEach summarizes every chunk in order and reports it` turns ✔. The page calls this function from Step 4.

## 4. Run the whole pipeline (map-reduce)

Reduce means: combine many results into one. The pipeline repeats rounds until the text fits:

1. Measure the current text (Step 1). If it fits, stop the rounds.
2. Split it into chunks that fit (Step 2).
3. Map: summarize each chunk as key points (Step 3).
4. Join the summaries. They become the text of the next round.

When the text fits, a second summarizer with `finalOptions` (type `tldr`) writes one final summary. `maxRounds` stops the loop if the summaries don't get shorter.

In `summarizeLarge()`, create a mapper with `chunkOptions`, run the rounds, and destroy it in `finally`. Then create a finisher with `finalOptions`, write the final summary, report it, and destroy the finisher in its own `finally`. Use `quotaOverride` when it is smaller than the real quota.

> [!WARNING]
> Pass `quota * charsPerToken` to `splitIntoChunks()`. We plan with `charsPerToken = 3`, although English averages about 4: planning with fewer characters per token makes chunks smaller than necessary, so they still fit when a text uses more tokens than average. A chunk that is too large fails with `QuotaExceededError`.

> [!TIP]
> A summarizer's options are fixed at `create()`. Key points for the chunks and a TL;DR at the end need two summarizers.

<details>
  <summary>summarizeLarge() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts
export async function summarizeLarge(
  text: string,
  onStage: (stage: Stage) => void,
  signal?: AbortSignal,
  quotaOverride?: number,
): Promise<string> {
  // 4a · Map/reduce rounds with the key-points summarizer.
  let current = text;
  const mapper = /* createSummarizer with chunkOptions */;
  try {
    const quota = /* the smaller of mapper.inputQuota and quotaOverride */;
    const maxChars = /* quota in characters */;
    for (let round = 1; ; round++) {
      const budget = /* Step 1 on current, with quota */;
      /* report `Round ${round} · measure` */
      /* fits? → break.  round > maxRounds? → throw */
      const chunks = /* Step 2 */;
      /* report `Round ${round} · split` */
      const summaries = /* Step 3 */;
      current = /* the summaries, joined by blank lines */;
    }
  } finally {
    /* release the mapper */
  }

  // 4b · The text fits now: one final summary with a different summarizer.
  const finisher = /* createSummarizer with finalOptions */;
  try {
    /* summarize current, report 'Final summary', return it */
  } finally {
    /* release the finisher */
  }
}
```

</details>

For the quota, `Math.min(mapper.inputQuota, quotaOverride ?? Infinity)` uses the pretend quota only when it is smaller. Report each round with `onStage({ name, detail })`, for example `` `${budget.usage} of ${budget.quota} tokens: ${budget.fits ? 'fits' : 'too large'}` `` and `` `${chunks.length} chunks of at most ${maxChars} characters` ``. The final stage's detail is `` `${current.length} characters in, ${summary.length} out` ``.

<details>
  <summary>summarizeLarge() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts
export async function summarizeLarge(
  text: string,
  onStage: (stage: Stage) => void,
  signal?: AbortSignal,
  quotaOverride?: number,
): Promise<string> {
  // 4a · Map/reduce rounds with the key-points summarizer.
  let current = text;
  const mapper = await createSummarizer(chunkOptions, signal);
  try {
    // A smaller pretend quota lets you watch the chunking even when the real quota is large.
    const quota = Math.min(mapper.inputQuota, quotaOverride ?? Infinity);
    const maxChars = quota * charsPerToken;
    for (let round = 1; ; round++) {
      const budget = await fitsInQuota(mapper, current, quota, signal);
      onStage({
        name: `Round ${round} · measure`,
        detail: `${budget.usage} of ${budget.quota} tokens: ${budget.fits ? 'fits' : 'too large'}`,
      });
      if (budget.fits) break;
      if (round > maxRounds)
        throw new Error(
          `The text is still too large after ${maxRounds} rounds.`,
        );
      const chunks = splitIntoChunks(current, maxChars);
      onStage({
        name: `Round ${round} · split`,
        detail: `${chunks.length} chunks of at most ${maxChars} characters`,
      });
      const summaries = await summarizeEach(mapper, chunks, onStage, signal);
      // The next round works on the summaries, not on the original text.
      current = summaries.join('\n\n');
    }
  } finally {
    mapper.destroy();
  }

  // 4b · The text fits now: one final summary with a different summarizer.
  const finisher = await createSummarizer(finalOptions, signal);
  try {
    const summary = await finisher.summarize(current, { signal });
    onStage({
      name: 'Final summary',
      detail: `${current.length} characters in, ${summary.length} out`,
    });
    return summary;
  } finally {
    finisher.destroy();
  }
}
```

| Code                                                     | Meaning                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Math.min(mapper.inputQuota, quotaOverride ?? Infinity)` | Use the pretend quota when it is smaller than the real one. `?? Infinity` means "no override".    |
| `for (let round = 1; ; round++)`                         | A loop without a condition: it ends with `break` (fits) or `throw` (too many rounds).             |
| Two summarizers                                          | The options are fixed at `create()`, so key points and the final TL;DR need separate summarizers. |
| The `finally` before 4b                                  | The mapper is released before the finisher is created, so only one summarizer is alive at a time. |

</details>

Save. Keep **Simulate a tiny quota** checked and click **Summarize the whole document** in section **D**. In the simulation the trace looks like this:

```text
Round 1 · measure   1080 of 300 tokens: too large
Round 1 · split     6 chunks of at most 900 characters
Chunk 1 of 6 … Chunk 6 of 6
Round 2 · measure   415 of 300 tokens: too large
Round 2 · split     2 chunks of at most 900 characters
Chunk 1 of 2, Chunk 2 of 2
Round 3 · measure   148 of 300 tokens: fits
Final summary       590 characters in, 176 out
```

Well done! A real model gives other numbers, but the same shape. Press **Stop** during a run: the trace stops and the log says `cancelled`. Uncheck the tiny quota and run again. In the simulation (quota 1024) the document is just too large: one round of 2 chunks of at most 3072 characters, then `Round 2 · measure   127 of 1024 tokens: fits`. On a native device whose quota fits the document, there are no chunks at all, only `Round 1 · measure … fits` and the final summary.

> [!WARNING]
> A summary of summaries loses information. Each round sees only the previous summaries, never the original document: whatever a chunk summary leaves out is gone for every later round, and a model can distort a fact on the way. Look at the final summary: in the simulation it talks only about _Sintel_, because the simulation keeps the first sentences, and the other films got lost in the rounds. A real model loses less, but it can still drop or change details. Show the original next to the combined summary, as the cinema's Story panel does (`features/notes/movie-summary.service.ts`), use map-reduce only when the input does not fit, and keep chunks as large as the quota allows.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 3-3
```

Expected result:

```
  ✔ Step 1 · fitsInQuota measures the text and compares it with the quota
  ✔ Step 2 · splitIntoChunks keeps paragraphs whole and packs them up to maxChars
  ✔ Step 2 · splitIntoChunks falls back to sentences, then to whole words
  ✔ Step 3 · summarizeEach summarizes every chunk in order and reports it
  ✔ Step 4 · summarizeLarge reduces a document bigger than the quota, then writes the final summary
  ✔ Step 4 · summarizeLarge skips chunking when the text fits, and respects quotaOverride

  6 passed, 0 failed
```

The check runs your file in Node against the simulated AI with small quotas. It checks the token budget, that no word is lost or cut, the number of model calls, and that every summarizer is destroyed. It does not judge how good the final summary is.

### Troubleshooting

| You see                                                      | What to do                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 3-3, Step N` in the log    | That function still calls `todo(...)`. Replace the whole line, then save.                                                        |
| `QuotaExceededError` during **Summarize the whole document** | A chunk is still too large. Pass `quota * charsPerToken` to `splitIntoChunks()` in Step 4.                                       |
| `The text is still too large after 4 rounds`                 | The text does not get shorter. End each round with `current = summaries.join('\n\n')`, so the next round measures the summaries. |
| Every paragraph is its own chunk                             | Return `pack(pieces, '\n\n', maxChars)` at the end of Step 2.                                                                    |
| A chunk ends in the middle of a word                         | Build chunks with `pack()` on sentences and whole words instead of `text.slice()`.                                               |
| The page did not change after saving                         | Check the app's terminal for a compile error. It names the file and the line.                                                    |

Still stuck? `pnpm lab:solve 3-3` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 3-3` brings back the starter file.

> [!NOTE]
> In the cinema, `apps/movie-theater/src/app/features/notes/movie-summary.service.ts` builds the Story panel's "sections then combined summary": it summarizes each programme note (a natural section) as key points, then summarizes those summaries. Its comments explain that our short notes don't need it to fit, and that each stage can lose facts. `apps/movie-theater/src/app/ai/summarizer/summarizer.api.ts` uses one short-lived summarizer per call, destroyed in `finally`.

## 5. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Before summarizing a chunk, measure it with `fitsInQuota()`. If it does not fit, split it again with a smaller `maxChars`. Then the pipeline also works for texts with many tokens per character.
- Pass `context: 'Part of a longer document about three open movies.'` to every chunk's `summarize()` call. Does the real model's summary change?
- Keep the chunk summaries of round 1 and show them next to the final summary, so a reader can see what was dropped.
