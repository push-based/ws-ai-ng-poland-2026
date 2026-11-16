# Exercise 3.3: Summarizing documents larger than the context

On-device models accept a limited amount of input. Measure a long document, split it into chunks that fit, summarize each chunk, and combine the results into one summary.

- **Page:** http://127.0.0.1:4200/lab/3-3
- **You edit:** `apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise.ts`
- **Check:** `pnpm lab:check 3-3`
- **Time:** ~20 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`longDocument`, `chunkOptions`, `finalOptions`, `createSummarizer()`, `sentencesOf()` and `pack()` are given. Read `pack()` once. You write the four functions below them.

Keep **Simulate a tiny quota of 300 tokens** checked. Chrome's real quota may fit the whole document, and then there is nothing to chunk.

## 1. Check whether the text fits

`inputQuota` is the most tokens a summarizer accepts in one call. Above it, `summarize()` fails with a `QuotaExceededError`.

In `fitsInQuota()`, measure the text with `summarizer.measureInputUsage(text, { signal })` and return `{ usage, quota, fits }`. `fits` is `usage <= quota`.

<details>
  <summary>Solution: <code>fitsInQuota()</code></summary>

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

### Try it

1. In section **B**, click **Measure the document**.
   - You see **Too large**, in the simulation `1080 of 300 tokens`.

## 2. Split the text into chunks

Cut at the most natural boundary that still fits:

1. Paragraphs (separated by a blank line), when they fit.
2. A paragraph that is too long is cut into sentences.
3. A sentence that is too long is cut into words.

In `splitIntoChunks()`, split the text this way and join the pieces with `pack()` into chunks of at most `maxChars`.

> **Warning:** Do not use `text.slice(0, maxChars)`. It cuts words in half.

<details>
  <summary>Hint · skeleton: <code>splitIntoChunks()</code></summary>

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
    return /* pack(sentences, ' ', maxChars) */;
  });

  // 2c · Put neighbouring pieces together, so each chunk is as full as possible.
  return /* pack(pieces, '\n\n', maxChars) */;
}
```

</details>

<details>
  <summary>Solution: <code>splitIntoChunks()</code></summary>

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

</details>

### Try it

1. In section **C**, click **Split the document**.
2. Change the limit to **150** and split again: long paragraphs are now cut between sentences.

## 3. Summarize every chunk

In `summarizeEach()`, loop over the chunks in order:

- Call `signal?.throwIfAborted()`.
- Summarize with `summarizer.summarize(chunk, { signal })`.
- Report with `onStage({ name: 'Chunk 2 of 6', detail: summary })`.

Return the summaries.

<details>
  <summary>Hint · skeleton: <code>summarizeEach()</code></summary>

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

<details>
  <summary>Solution: <code>summarizeEach()</code></summary>

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

## 4. Run the whole pipeline

Repeat rounds until the text fits:

1. Measure the current text (Step 1). If it fits, stop.
2. Split it into chunks (Step 2).
3. Summarize each chunk (Step 3).
4. Join the summaries with a blank line. They are the text of the next round.

Then a second summarizer writes the final summary. It has to be a second one, because a summarizer's options are fixed at `create()`.

In `summarizeLarge()`:

- Create a mapper with `chunkOptions`, run the rounds and destroy it in `finally`.
- Create a finisher with `finalOptions`, write the final summary and destroy it in `finally`.
- Use `quotaOverride` when it is smaller than the real quota.
- Pass `quota * charsPerToken` to `splitIntoChunks()`. `charsPerToken` is 3 although English averages 4, so chunks stay on the safe side.
- Report each measure, each split and the final summary with `onStage({ name, detail })`. Use the names from the trace below (`Round 1 · measure`, `Round 1 · split`, `Final summary`); `detail` is free text.
- Throw an `Error` when the text still does not fit after `maxRounds` rounds (`round > maxRounds`).

<details>
  <summary>Hint · skeleton: <code>summarizeLarge()</code></summary>

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

<details>
  <summary>Solution: <code>summarizeLarge()</code></summary>

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

</details>

### Try it

In section **D**, click **Summarize the whole document**. The simulation shows:

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

A summary of summaries loses information. Each round sees only the previous summaries, never the original. Use it only when the input does not fit.

---

## Check your work

```sh
pnpm lab:check 3-3
```

All 6 checks should pass.

Stuck?

- `pnpm lab:solve 3-3` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 3-3` restores the starter.

| You see                                  | What to do                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `QuotaExceededError` during the pipeline | Pass `quota * charsPerToken` to `splitIntoChunks()` in Step 4.         |
| Your `maxRounds` error is thrown         | End each round with `current = summaries.join('\n\n')`.                |
| Every paragraph is its own chunk         | Return `pack(pieces, '\n\n', maxChars)` at the end of Step 2.          |
| A chunk ends in the middle of a word     | Build chunks with `pack()` on sentences and words, not `text.slice()`. |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `features/notes/movie-summary.service.ts` builds the Story panel's combined summary this way.

## Bonus

- Measure each chunk with `fitsInQuota()` before summarizing, and split it again when it does not fit.
- Show the round 1 summaries next to the final summary, so a reader sees what was dropped.
