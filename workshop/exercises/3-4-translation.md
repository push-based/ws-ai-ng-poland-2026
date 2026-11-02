# Exercise 3.4 (bonus): Translating subtitles

The cinema's movies come with English subtitles, and not every viewer reads English. In this exercise we will translate a movie's real dialogue subtitles into Polish, German, Spanish or French on the device, while every subtitle keeps its exact timing. We start with the Language Detector, which tells the app which language a viewer writes in.

**Page:** http://127.0.0.1:4200/lab/3-4 · **You edit:** `apps/movie-theater/src/app/lab/exercises/3-4-translation/exercise.ts` · **Check:** `pnpm lab:check 3-4` · **Time:** ~20 min · **Level:** bonus

> [!NOTE]
> This whole exercise is a bonus. Do it when you have finished 3.1–3.3, or at home. Nothing later depends on it.

## Goal

At the end of this exercise **Translate subtitles** shows the dialogue of _Elephants Dream_ in Polish, and every cue keeps its original **Start** and **End** time.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/3-4 in Chrome. Look at the box **Use simulated browser AI** near the top of the page:

- It says **NATIVE**: keep the switch off. Language Detector and Translator have their own availability; you check it in the exercise.
- It says **NO BUILT-IN AI DETECTED**: turn the switch on. The simulation recognises a few Polish, German and Spanish words. English → Polish uses the cinema's prepared Polish subtitles; other languages are only tagged, for example `[de] Are you hurt?`.

Open `exercise.ts`. Given at the top: `targetLanguages` (the four subtitle languages the page offers) and the result types `DetectedLanguage` and `TranslationSupport`. The `Cue` type is imported from the catalogue (`libs/catalogue/src/movie.ts`). You write the three functions below them, each of which still calls `todo('3-4', …)`.

## 1. Detect the language of a request

The cinema's concierge model works in English. If a viewer writes in Polish, the app can detect the language first, translate the request to English, and translate the answer back. `LanguageDetector` is a small task API for the first part. `detector.detect(text)` returns a list of guesses, sorted from most to least likely, each with a `detectedLanguage` (a code such as `'pl'`) and a `confidence` between 0 and 1.

Confidence is the model's own estimate, not a certainty: short or mixed texts get unreliable guesses. If there is no guess at all, we answer `'und'`, the standard code for "undetermined".

In `detectLanguage()`, feature-detect `LanguageDetector`, throw a readable `Error` when it is missing or `availability()` says `'unavailable'`, create a detector, and return the first result of `detect()` as `{ language, confidence }`. Fall back to `{ language: 'und', confidence: 0 }`, and destroy the detector in `finally`.

> [!TIP]
> `const [best] = await detector.detect(text, { signal })` takes the most likely guess, or `undefined` for an empty list.

<details>
  <summary>detectLanguage() skeleton</summary>

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

Feature-detect with `typeof LanguageDetector === 'undefined'`. Read the fields with `best?.detectedLanguage ?? 'und'` and `best?.confidence ?? 0`: `?.` reads a field only if `best` exists, and `??` supplies the fallback.

<details>
  <summary>detectLanguage() solution</summary>

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

| Code                                      | Meaning                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `typeof LanguageDetector === 'undefined'` | Feature detection, safe even when the name does not exist.                                |
| `const [best] = …`                        | Array destructuring: `best` is the first element, or `undefined` for an empty list.       |
| `best?.detectedLanguage ?? 'und'`         | `?.` reads the field only if `best` exists; `??` uses `'und'` when the result is missing. |
| `finally { detector.destroy(); }`         | Release the detector after success, errors and cancellation.                              |

</details>

Save. In section **A**, click the example **Szukam zabawnego filmu na wieczór.** and then **Detect language**. You see **Polish (pl)** and a confidence. Try the German and Spanish examples, then type a single word such as `Film`: the confidence drops, or the guess changes. The simulation answers **English (en)** with 85% for any text without its Polish, German or Spanish keywords.

## 2. Check which language pairs work here

A translation model is chosen per language pair. English → Polish being available says nothing about English → French, and each pair may need its own download. So `Translator.availability()` takes both languages: `{ sourceLanguage, targetLanguage }`, with short codes such as `'en'`, `'pl'`, `'de'`, `'es'`, `'fr'`.

In `canTranslate()`, return `'missing'` when there is no `Translator` global, otherwise the answer of `Translator.availability()` for this pair.

<details>
  <summary>canTranslate() solution</summary>

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

Save. In section **B**, click **Check en → every target**. You get one badge per pair, for example `en → pl (Polish): available` and `en → fr (French): downloadable` on a native device; different devices give different answers. In the simulation all four pairs share one state: **downloadable** until any simulated model has been created, **available** after that (the detector from Step 1 counts).

## 3. Translate subtitle cues

A subtitle track is a list of cues. Each cue has a `start` and `end` time in seconds and the `text` to show in between (see the `Cue` type); the player shows a cue while the video time is between `start` and `end`. When we translate subtitles, only the text changes. The timing comes from the film's soundtrack: in _Elephants Dream_ the second line starts at 6.994 s in every language.

Three rules shape `translateCues()`:

- No model when there is nothing to do. _Big Buck Bunny_ has no dialogue, so its track is empty, and translating a track into its own language changes nothing. For an empty track or `source === target`, return copies of the cues without creating a translator.
- One translator for all cues. Creating a translator can take time (and may download a model). Check the pair with `canTranslate()`, create the translator once, translate every cue in order, and destroy it at the end.
- Send only `cue.text` to the translator, and copy `start` and `end` unchanged with `{ ...cue, text }`, so the subtitles stay in sync with the speech.

In `translateCues()`, apply the three rules, report progress with `onProgress?.(done, total)` after each cue, and call `signal?.throwIfAborted()` before each cue so Stop works between cues.

> [!WARNING]
> Build each translated cue with `{ ...cue, text }`. It copies `start` and `end` from the original cue and replaces only the text. The page shows a red **times changed!** badge when a time differs.

<details>
  <summary>translateCues() skeleton</summary>

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

For 3a, `cues.map((cue) => ({ ...cue }))` returns new objects with the same content, so the catalogue's cues stay untouched. For 3c, call `Translator.create({ sourceLanguage: source, targetLanguage: target, signal })`, and in the loop `await translator.translate(cue.text, { signal })`, then `onProgress?.(translated.length, cues.length)`.

<details>
  <summary>translateCues() solution</summary>

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

| Code                                | Meaning                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `cues.map((cue) => ({ ...cue }))`   | New objects with the same content. The catalogue's cues stay unchanged, so the original stays correct. |
| `{ ...cue, text }`                  | Copy `start` and `end` from `cue`, then replace `text` with the translation.                           |
| `for (const cue of cues)` + `await` | One cue after the other, in order. `throwIfAborted()` makes Stop work between cues.                    |
| `onProgress?.(done, total)`         | The page shows "3 of 7 cues".                                                                          |

</details>

Save. In section **C**, keep **Elephants Dream** and **Polish**, then click **Translate subtitles**:

1. The right column fills in, the progress says `7 of 7 cues`, and the Start/End columns stay the same.
2. Switch the target to **German** and translate again. On a native device, Chrome may download that pair the first time; the simulation shows `[de] …`.
3. Choose **Big Buck Bunny** and click **Translate subtitles**: no translator is created, and the log says `This excerpt has no dialogue: nothing to translate.`

Nice! Your subtitles now speak Polish and still match the speech.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 3-4
```

Expected result:

```
  ✔ Step 1 · detectLanguage returns the most likely language and destroys the detector
  ✔ Step 1 · detectLanguage falls back to "und" and explains a missing API
  ✔ Step 2 · canTranslate checks availability for exactly this language pair
  ✔ Step 3 · translateCues translates the text with ONE translator and keeps the timing
  ✔ Step 3 · translateCues needs no model for an empty track or the same language

  5 passed, 0 failed
```

The check runs your file in Node against the simulated AI. It checks the language pair, the number of translators, unchanged timings and cleanup. It does not judge translation quality.

### Troubleshooting

| You see                                                   | What to do                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 3-4, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                      |
| **times changed!** in the table                           | Build each result with `{ ...cue, text }`, so `start` and `end` come from the original cue.    |
| `… is not exposed by this browser`                        | Use an up-to-date desktop Chrome, check `/preflight`, or turn on **Use simulated browser AI**. |
| `Translating en → fr is unavailable on this device`       | This pair is not supported here. Try another target language.                                  |
| `NotAllowedError` when translating                        | The language pack download needs a user action. Start it from the button, as the page does.    |
| The first translation of a new pair takes long            | Chrome is downloading that language pack. Follow it in `chrome://on-device-internals`.         |
| Simulated German shows `[de] …`                           | Expected: the simulation only tags other languages. Use native mode to see real translations.  |

Still stuck? `pnpm lab:solve 3-4` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 3-4` brings back the starter file.

> [!NOTE]
> The cinema uses both APIs. `apps/movie-theater/src/app/ai/language/language-detector.api.ts` runs the same detection, with `'und'` as the fallback. `apps/movie-theater/src/app/ai/language/translator.api.ts` → `translateMany()` reuses one translator for a batch and checks availability per pair. `apps/movie-theater/src/app/features/player/caption-translation.service.ts` translates only cue text and caches successful translations per movie and language; the player keeps using the original timings. On the home page, ask the concierge in Polish: the request is detected, translated to English, answered and translated back.

## 4. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Cache translated tracks in a `Map` keyed by `movieId:language`, like the cinema does, so switching back to Polish needs no model call.
- Turn any request into English: run `detectLanguage()` on it, and handle `'und'` first (ask the viewer, or send the request as it is), because `translateCues(…, 'und', 'en')` fails as unavailable. For a detected language, call `translateCues([{ start: 0, end: 0, text: request }], detected.language, 'en')`.
- Show all detection results (not only the first) with their confidence, and see how they change for short texts.
