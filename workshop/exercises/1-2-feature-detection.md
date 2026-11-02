# Exercise 1.2: Feature and capability detection

Chrome's built-in AI is not there in every browser, and where it is, not every configuration runs on every device. In this exercise we will build a capability matrix: one row per built-in AI API and configuration, showing whether this device can run it right now, after a download, or not at all.

**Page:** http://127.0.0.1:4200/lab/1-2 · **You edit:** `apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts` · **Check:** `pnpm lab:check 1-2` · **Time:** ~15 min · **Level:** core

## Goal

At the end of this exercise **Run all checks** shows eight rows, each with a badge that says whether this device can run that API and configuration now, after a download, or not at all, and it shows them in a browser without any of these APIs too.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/1-2 in Chrome. If the page says **NO BUILT-IN AI DETECTED**, turn on **Use simulated browser AI**: your code then runs against a simulation, and everything in this exercise still works.

Open `exercise.ts`. `aiGlobals`, `textPromptOptions` and `taskChecks` at the top are given. You write the five functions below them, each of which still calls `todo('1-2', …)`.

Chrome ships the AI inside the browser. Your page does not download or host a model: it calls JavaScript APIs, and the browser manages the models behind them, shared by every site.

| Global                              | Task                                 | Options that matter for availability           |
| ----------------------------------- | ------------------------------------ | ---------------------------------------------- |
| `LanguageModel`                     | Prompt API: general prompts and chat | input/output types (text, image) and languages |
| `Summarizer`                        | Summaries                            | input and output languages                     |
| `Translator`                        | Translation                          | the language pair                              |
| `LanguageDetector`                  | Which language is this text?         | –                                              |
| `Writer`, `Rewriter`, `Proofreader` | Writing help (experimental)          | languages                                      |

Every API answers two separate questions:

1. **Feature detection:** does the global exist in this browser? (`typeof LanguageModel`)
2. **Capability detection:** can this device run this exact configuration? (`LanguageModel.availability(options)`)

`availability()` returns one of four strings, and we add two states of our own:

| Value            | Meaning                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| `'available'`    | The model is on the device. `create()` needs no download.                            |
| `'downloadable'` | The device can run it, but the model must be downloaded first. `create()` does that. |
| `'downloading'`  | A download is already running.                                                       |
| `'unavailable'`  | Not with these options on this device (language, modality or hardware).              |
| `'missing'`      | Ours: the global does not exist in this browser.                                     |
| `'error'`        | Ours: the check itself threw.                                                        |

## 1. Is the API exposed?

Reading a variable that does not exist throws a `ReferenceError`, so a bare `Summarizer` crashes a browser without it. Reading a property that does not exist gives `undefined`. Browser globals are properties of `globalThis` (`window` in a page), so `globalThis[name]` looks up a global by its name as a string, safely.

In `isExposed()`, return whether `globalThis[name]` is something other than `undefined`.

> [!TIP]
> Look the name up on `globalThis` each time the function runs, and use `typeof … !== 'undefined'`. `(globalThis as Record<string, unknown>)` only tells TypeScript that the object can be indexed with any string; it does not change what runs.

<details>
  <summary>isExposed() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts
export function isExposed(name: string): boolean {
  return typeof (globalThis as Record<string, unknown>)[name] !== 'undefined';
}
```

</details>

Save. In section **A**, click **Check the globals**. With the simulation on, all seven badges say **exposed** (for example **LanguageModel · exposed**). Turn the simulation off and click **Check the globals** again: in a browser without built-in AI, they turn to **missing**, and the page keeps working.

## 2. Run one check safely

`availability()` can still fail: an experimental API can throw for options it does not know, or the global can be missing. A capability screen has to stay up whatever one API does, so `checkApi()` returns a row in every case:

- global missing → `'missing'`, and `check()` is not called;
- check returns → its answer;
- check throws → `'error'`, with the error message as the detail.

`check` is a function we call later, so `Summarizer.availability(...)` only runs after we know `Summarizer` exists.

In `checkApi()`, feature-detect `api` with `isExposed()` first, then `await check()` inside `try`, and turn a thrown error into an `'error'` row in `catch`.

> [!WARNING]
> Return the `'missing'` row before you call `check()`. Calling `check()` for a global that isn't there throws a `ReferenceError` such as `Summarizer is not defined`.

<details>
  <summary>checkApi() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts
export async function checkApi(
  api: AiGlobal,
  detail: string,
  check: () => Promise<Availability>,
): Promise<ApiCheck> {
  /* 1. not exposed? return a 'missing' row */
  try {
    /* 2. return a row with the awaited check() as status */
  } catch (error) {
    /* 3. return an 'error' row, with the message as detail */
  }
}
```

</details>

Each branch returns `{ api, detail, status }`. In `catch`, read the message with `error instanceof Error ? error.message : String(error)`, because anything can be thrown, and put it in `detail`.

<details>
  <summary>checkApi() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts
export async function checkApi(
  api: AiGlobal,
  detail: string,
  check: () => Promise<Availability>,
): Promise<ApiCheck> {
  // 2a · Feature detection first: never call a missing API.
  if (!isExposed(api)) return { api, detail, status: 'missing' };
  try {
    // 2b · Capability check: can this device run THESE options?
    return { api, detail, status: await check() };
  } catch (error) {
    // 2c · A failing check becomes a row, not a crash.
    const message = error instanceof Error ? error.message : String(error);
    return { api, detail: message, status: 'error' };
  }
}
```

</details>

Save. With the simulation on, click **Run a failing check** in section **A**. You get a red **error** row with the message _"Demo failure: this check always throws."_, and the page keeps working. With the simulation off in a browser without built-in AI, the same button gives a **missing** row instead, because `LanguageModel` is not exposed and `check()` never runs.

## 3. Two checks for the Prompt API

Availability depends on the options, not only on the API. The same `LanguageModel` can be `'available'` for English text and `'unavailable'` for images on the same device. So we ask twice: once for text, once for text plus image input. This mirrors the reference app, where the concierge (text) and _Describe this shot_ (image) check separately.

In `promptChecks()`, return two `AvailabilityCheck` objects for `'LanguageModel'`, each with its own `detail`. The first checks `textPromptOptions`; the second checks the same options with `{ type: 'image' }` added to `expectedInputs`.

> [!TIP]
> Pass the same options to `availability()` that you will later pass to `create()`. Checking English text and then creating an image session proves nothing.

<details>
  <summary>promptChecks() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts
export function promptChecks(): AvailabilityCheck[] {
  return [
    {
      api: 'LanguageModel',
      detail: 'English text → English text',
      check: () => LanguageModel.availability(textPromptOptions),
    },
    {
      api: 'LanguageModel',
      detail: 'English text + image → English text',
      check: () =>
        LanguageModel.availability({
          ...textPromptOptions,
          expectedInputs: [
            { type: 'text', languages: ['en'] },
            { type: 'image' },
          ],
        }),
    },
  ];
}
```

`...textPromptOptions` copies the text options; the `expectedInputs` after it replaces that one field.

</details>

The page shows these rows from Step 5 onwards. For now, run `pnpm lab:check 1-2` in a second terminal: the `Step 3 · promptChecks asks LanguageModel about text, and separately about text + image` line turns ✔.

## 4. A translator check for a language pair

The Translator answers availability per language pair. English → Polish can be ready while English → Japanese still needs a download, or is not supported at all. So the check takes the pair the user picked.

In `translatorCheck()`, return an `AvailabilityCheck` for `'Translator'` that shows the pair in `detail` and calls `Translator.availability({ sourceLanguage, targetLanguage })`.

<details>
  <summary>translatorCheck() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts
export function translatorCheck(
  sourceLanguage: string,
  targetLanguage: string,
): AvailabilityCheck {
  return {
    api: 'Translator',
    detail: `${sourceLanguage} → ${targetLanguage}`,
    check: () => Translator.availability({ sourceLanguage, targetLanguage }),
  };
}
```

`{ sourceLanguage, targetLanguage }` is shorthand for `{ sourceLanguage: sourceLanguage, targetLanguage: targetLanguage }`.

</details>

Run `pnpm lab:check 1-2` again: `Step 4 · translatorCheck checks exactly the chosen language pair` turns ✔.

## 5. Run every check at the same time

The checks don't depend on each other, so we start them all at once instead of one after another. `checks.map(...)` starts every check and gives an array of promises; `Promise.all(...)` waits until every one has finished. Because `checkApi()` never rejects (Step 2), one failing API cannot hide the others.

The list is the two Prompt checks, the translator pair, then `taskChecks`: the given checks for Summarizer, LanguageDetector, Writer, Rewriter and Proofreader. Read them: they use the same options as the cinema's AI Inspector.

In `checkAll()`, build that list in this order and return `Promise.all()` over `checkApi()` for each item.

> [!WARNING]
> Start every check before you await any of them: `Promise.all(checks.map(...))`. A `for … of` loop with `await` inside runs the checks one after another, and the check reports `start every check before awaiting any of them`.

<details>
  <summary>checkAll() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts
export async function checkAll(
  sourceLanguage: string,
  targetLanguage: string,
): Promise<ApiCheck[]> {
  const checks = [
    /* the two Prompt checks, the translator pair, the task checks */
  ];
  return Promise.all(
    checks.map(/* each check → checkApi(api, detail, check) */),
  );
}
```

</details>

Spread `...promptChecks()` and `...taskChecks` into the array, with `translatorCheck(sourceLanguage, targetLanguage)` between them. In `map`, destructure each item with `({ api, detail, check }) => …` and pass the three values to `checkApi()`.

<details>
  <summary>checkAll() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts
export async function checkAll(
  sourceLanguage: string,
  targetLanguage: string,
): Promise<ApiCheck[]> {
  const checks = [
    ...promptChecks(),
    translatorCheck(sourceLanguage, targetLanguage),
    ...taskChecks,
  ];
  return Promise.all(
    checks.map(({ api, detail, check }) => checkApi(api, detail, check)),
  );
}
```

</details>

Save. In section **B**, click **Run all checks**. You get eight rows with coloured badges. Then:

1. Pick **English → Japanese** and run again. With the simulation, the translator row becomes **unavailable** (it only knows en, pl, de, es and fr). In native Chrome you see your device's real answer.
2. Read the legend under the table. **downloadable** is not a failure: it means "a click can make this work" (exercise 1.3).
3. Native Chrome: open `chrome://on-device-internals` in a new tab to see the model status behind these answers.

Run `pnpm lab:check 1-2`: `Step 5 · checkAll runs the checks in parallel and one failure hides nothing` turns ✔. That test uses slow fake checks and confirms every check started before the first one finished. Nice!

> [!NOTE]
> In the simulation, image input reports the same state as text. Only native Chrome can tell you whether your device supports image input.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 1-2
```

Expected result:

```
  ✔ Step 1 · isExposed detects globals without throwing
  ✔ Step 2 · checkApi returns the availability() answer for an exposed API
  ✔ Step 2 · checkApi reports 'missing' and 'error' instead of throwing
  ✔ Step 3 · promptChecks asks LanguageModel about text, and separately about text + image
  ✔ Step 4 · translatorCheck checks exactly the chosen language pair
  ✔ Step 5 · checkAll returns one row per check, in order
  ✔ Step 5 · checkAll runs the checks in parallel and one failure hides nothing

  7 passed, 0 failed
```

The check runs your file in Node against the simulated AI. It verifies the options you pass and that every failure becomes a row. It cannot tell you what your real device supports: that is what the page in native Chrome is for.

### Troubleshooting

| You see                                                   | What to do                                                                                                     |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 1-2, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                      |
| An **error** row that says `Summarizer is not defined`    | `check()` ran for a global that is not there. In `checkApi()`, return `'missing'` before calling `check()`.    |
| Every row is **missing**                                  | This browser has no built-in AI. Turn on **Use simulated browser AI**, or open `/preflight` in desktop Chrome. |
| `start every check before awaiting any of them` (check)   | Replace the `for … of` loop with `await` inside by `Promise.all(checks.map(...))`.                             |
| Text-only row is **available** but the image row is not   | That's a real answer: your device supports text but not image input for the Prompt API.                        |
| The page did not change after saving                      | Check the app's terminal for a compile error. It names the file and the line.                                  |

Still stuck? `pnpm lab:solve 1-2` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 1-2` brings back the starter file.

> [!NOTE]
> The cinema app runs the same checks. `apps/movie-theater/src/app/ai/capabilities.service.ts` is behind **AI Inspector → Setup**: the same checks, in parallel, each in its own `try/catch`. `apps/movie-theater/src/app/ai/ai.types.ts` has `Capability` with the same `'missing'` and `'error'` states, and `englishPromptOptions`. In `apps/movie-theater/src/app/ai/prompt/prompt.api.ts`, the image session declares `{ type: 'image' }` in `expectedInputs` and is checked separately from text.

## 6. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Add a row for the Prompt API with Polish input (`languages: ['pl']`). Does your device support it?
- Add an audio input check (`{ type: 'audio' }`). The simulation always answers `'unavailable'` for audio.
- Time each check (`performance.now()` before and after `check()`) and the whole `checkAll()` call. Compare the total with the slowest check and with the sum of all checks: total → \_\_\_ ms · slowest → \_\_\_ ms · sum → \_\_\_ ms.
