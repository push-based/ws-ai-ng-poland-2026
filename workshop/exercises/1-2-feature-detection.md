# Exercise 1.2: Feature and capability detection

Build a capability table: one row per built-in AI API, showing whether this device can run it now, after a download, or not at all.

- **Page:** http://127.0.0.1:4200/lab/1-2
- **You edit:** `apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts`
- **Check:** `pnpm lab:check 1-2`
- **Time:** ~15 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`aiGlobals`, `textPromptOptions` and `taskChecks` are given. You write the five functions below them.

Every API answers two questions:

1. **Feature detection:** does the global exist? (`typeof LanguageModel`)
2. **Capability detection:** can this device run these exact options? (`LanguageModel.availability(options)`)

`availability()` returns `'available'`, `'downloadable'`, `'downloading'` or `'unavailable'`. We add `'missing'` (no such global) and `'error'` (the check threw).

## 1. Is the API exposed?

A bare `Summarizer` throws a `ReferenceError` in a browser without it. A lookup on `globalThis` is safe.

In `isExposed()`, return whether `globalThis[name]` is not `undefined`. TypeScript needs a cast: `(globalThis as Record<string, unknown>)[name]`.

<details>
  <summary>Solution: <code>isExposed()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise.ts
export function isExposed(name: string): boolean {
  return typeof (globalThis as Record<string, unknown>)[name] !== 'undefined';
}
```

</details>

### Try it

1. In section **A**, click **Check the globals**.
   - With the simulation on, all seven badges say **exposed**.

## 2. Run one check safely

One failing API must not take the whole table down. `checkApi()` always returns a row:

- global missing → `'missing'`, and `check()` is not called
- check returns → its answer
- check throws → `'error'`, with the message as `detail`

<details>
  <summary>Hint · skeleton: <code>checkApi()</code></summary>

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

<details>
  <summary>Solution: <code>checkApi()</code></summary>

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

### Try it

1. With the simulation on, click **Run a failing check**.
   - You get a red **error** row, and the page keeps working.

## 3. Two checks for the Prompt API

Availability depends on the options. The same device can run English text and still refuse images.

In `promptChecks()`, return two checks for `'LanguageModel'`: one with `textPromptOptions`, one with `{ type: 'image' }` added to `expectedInputs`. Give each its own `detail` text.

<details>
  <summary>Solution: <code>promptChecks()</code></summary>

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

</details>

## 4. A translator check for a language pair

The Translator answers per language pair.

In `translatorCheck()`, return a check for `'Translator'` that shows the pair in `detail` and calls `Translator.availability({ sourceLanguage, targetLanguage })`.

<details>
  <summary>Solution: <code>translatorCheck()</code></summary>

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

</details>

## 5. Run every check at the same time

The checks are independent, so start them all at once.

In `checkAll()`, build the list (Prompt checks, translator pair, then `taskChecks`) and return `Promise.all()` over `checkApi()` for each item.

> **Warning:** A `for … of` loop with `await` inside runs the checks one after another. Use `Promise.all(checks.map(...))`.

<details>
  <summary>Hint · skeleton: <code>checkAll()</code></summary>

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

<details>
  <summary>Solution: <code>checkAll()</code></summary>

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

### Try it

1. In section **B**, click **Run all checks**.
   - You get eight rows.
2. Pick **English → Japanese** and run again: in the simulation the translator row becomes **unavailable**.

A **downloadable** row is not a failure. It means a click can make it work (exercise 1.3).

---

## Check your work

```sh
pnpm lab:check 1-2
```

All 7 checks should pass.

Stuck?

- `pnpm lab:solve 1-2` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 1-2` restores the starter.

| You see                                           | What to do                                                     |
| ------------------------------------------------- | -------------------------------------------------------------- |
| An **error** row with `Summarizer is not defined` | In `checkApi()`, return `'missing'` before you call `check()`. |
| Every row is **missing**                          | This browser has no built-in AI. Turn on the simulation.       |
| `start every check before awaiting any of them`   | Replace the `for … of` loop by `Promise.all(checks.map(...))`. |
| Text row is **available**, image row is not       | A real answer: your device supports text but not image input.  |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `ai/capabilities.service.ts` runs the same checks behind **AI Inspector → Setup**.

## Bonus

- Add a row for Polish input (`languages: ['pl']`).
- Add an audio input check (`{ type: 'audio' }`).
- Time each check and the whole `checkAll()` call. Compare the total with the slowest check.
