# Exercise 3.4 (bonus): Translating subtitles

Detect which language a viewer writes in, then translate a movie's subtitles on the device while every subtitle keeps its timing.

- **Page:** http://127.0.0.1:4200/lab/3-4
- **You edit:** `apps/movie-theater/src/app/lab/exercises/3-4-translation/exercise.ts`
- **Check:** `pnpm lab:check 3-4`
- **Time:** ~20 min
- **Level:** bonus

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. It translates English → Polish. Other languages are only tagged, for example `[de] Are you hurt?`. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`targetLanguages` and the result types are given. You write the three functions below them.

## 1. Detect the language of a request

`detector.detect(text)` returns guesses, most likely first. Each has a `detectedLanguage` and a `confidence` from 0 to 1.

In `detectLanguage()`:

- Throw an `Error` when `typeof LanguageDetector === 'undefined'` or `availability()` says `'unavailable'`.
- Create a detector with `LanguageDetector.create({ signal })` and take the first result of `detect(text, { signal })`.
- Return `{ language, confidence }`, or `{ language: 'und', confidence: 0 }` when there is no guess.
- Destroy the detector in `finally`.

<details>
  <summary>Hint · skeleton: <code>detectLanguage()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-4-translation/exercise.ts
export async function detectLanguage(
  text: string,
  signal?: AbortSignal,
): Promise<DetectedLanguage> {
  /* no LanguageDetector global → throw a readable Error */
  /* availability() is 'unavailable' → throw a readable Error */

  const detector = /* create one, with the signal */;
  try {
    const [best] = /* detect the text */;
    return /* { language, confidence }, with 'und' and 0 as fallbacks */;
  } finally {
    /* release the detector */
  }
}
```

</details>

<details>
  <summary>Solution: <code>detectLanguage()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-4-translation/exercise.ts
export async function detectLanguage(
  text: string,
  signal?: AbortSignal,
): Promise<DetectedLanguage> {
  if (typeof LanguageDetector === 'undefined')
    throw new Error(
      'The Language Detector API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if ((await LanguageDetector.availability()) === 'unavailable')
    throw new Error('Language detection is unavailable on this device.');

  const detector = await LanguageDetector.create({ signal });
  try {
    // detect() returns guesses sorted from most to least likely: take the first.
    const [best] = await detector.detect(text, { signal });
    return {
      language: best?.detectedLanguage ?? 'und',
      confidence: best?.confidence ?? 0,
    };
  } finally {
    detector.destroy();
  }
}
```

</details>

### Try it

1. In section **A**, click **Szukam zabawnego filmu na wieczór.**, then **Detect language**: **Polish (pl)**.
2. Type a single word such as `Film`: the confidence drops, or the guess changes.
   - The simulation answers English.

## 2. Check which language pairs work here

Each language pair has its own model and its own download.

In `canTranslate()`, return `'missing'` when there is no `Translator` global. Otherwise return `Translator.availability({ sourceLanguage, targetLanguage })`.

<details>
  <summary>Solution: <code>canTranslate()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-4-translation/exercise.ts
export async function canTranslate(
  source: string,
  target: string,
): Promise<TranslationSupport> {
  if (typeof Translator === 'undefined') return 'missing';
  return Translator.availability({
    sourceLanguage: source,
    targetLanguage: target,
  });
}
```

</details>

### Try it

1. In section **B**, click **Check en → every target**.
   - You get one badge per pair.

## 3. Translate subtitle cues

A cue has a `start` time, an `end` time and a `text`. Only the text changes.

In `translateCues()`:

- For an empty track or `source === target`, return copies of the cues. No translator is needed.
- Check the pair with `canTranslate()` and throw an `Error` for `'missing'` and `'unavailable'`. Then create one translator for all cues, with the `signal`.
- For each cue: call `signal?.throwIfAborted()`, translate `cue.text`, keep the result as `{ ...cue, text }`, and call `onProgress?.(done, total)`.
- Destroy the translator in `finally`.

<details>
  <summary>Hint · skeleton: <code>translateCues()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-4-translation/exercise.ts
export async function translateCues(
  cues: readonly Cue[],
  source: string,
  target: string,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Cue[]> {
  // 3a · Nothing to translate: return copies and do not create (or download) a model.
  /* empty track or same language → copies of the cues */

  // 3b · Check this exact language pair (Step 2) before creating a translator.
  const support = /* Step 2 */;
  /* 'missing' or 'unavailable' → throw a readable Error */

  // 3c · ONE translator for all cues, translated in order.
  const translator = /* create it for this pair, with the signal */;
  try {
    const translated: Cue[] = [];
    for (const cue of cues) {
      /* 1. stopped?  2. translate cue.text  3. keep { ...cue, text }  4. report progress */
    }
    return translated;
  } finally {
    /* release the translator */
  }
}
```

</details>

<details>
  <summary>Solution: <code>translateCues()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/3-4-translation/exercise.ts
export async function translateCues(
  cues: readonly Cue[],
  source: string,
  target: string,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Cue[]> {
  // 3a · Nothing to translate: return copies and do not create (or download) a model.
  if (cues.length === 0 || source === target)
    return cues.map((cue) => ({ ...cue }));

  // 3b · Check this exact language pair (Step 2) before creating a translator.
  const support = await canTranslate(source, target);
  if (support === 'missing')
    throw new Error(
      'The Translator API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if (support === 'unavailable')
    throw new Error(
      `Translating ${source} → ${target} is unavailable on this device.`,
    );

  // 3c · ONE translator for all cues, translated in order.
  const translator = await Translator.create({
    sourceLanguage: source,
    targetLanguage: target,
    signal,
  });
  try {
    const translated: Cue[] = [];
    for (const cue of cues) {
      signal?.throwIfAborted();
      const text = await translator.translate(cue.text, { signal });
      // Only the text changes: start and end stay exactly as they were.
      translated.push({ ...cue, text });
      onProgress?.(translated.length, cues.length);
    }
    return translated;
  } finally {
    translator.destroy();
  }
}
```

</details>

### Try it

1. In section **C**, keep **Elephants Dream** and **Polish** and click **Translate subtitles**.
   - The progress says `7 of 7 cues`, and Start/End stay the same.
2. Choose **Big Buck Bunny**: it has no dialogue, so no translator is created.

---

## Check your work

```sh
pnpm lab:check 3-4
```

All 5 checks should pass.

Stuck?

- `pnpm lab:solve 3-4` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 3-4` restores the starter.

| You see                                        | What to do                                                    |
| ---------------------------------------------- | ------------------------------------------------------------- |
| **times changed!** in the table                | Build each result with `{ ...cue, text }`.                    |
| Your "unavailable" error for a language pair   | This pair is not supported here. Try another target language. |
| The first translation of a new pair takes long | Chrome is downloading that language pack.                     |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `features/player/caption-translation.service.ts` translates cue text only. On the home page, ask the concierge in Polish.

## Bonus

- Cache translated tracks in a `Map` keyed by `movieId:language`.
- Show all detection results with their confidence, and see how they change for short texts.
