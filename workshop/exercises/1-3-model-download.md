# Exercise 1.3: Downloading and initializing a model

Chrome downloads the built-in model once per device. Build the button that checks the model, downloads it with a progress bar, can be cancelled, and returns a session you can release again.

- **Page:** http://127.0.0.1:4200/lab/1-3
- **You edit:** `apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts`
- **Check:** `pnpm lab:check 1-3`
- **Time:** ~15 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page: it fakes a 1.6 s download. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`modelOptions` and the `ModelStatus` type are given. You write the five functions below them.

## 1. Explain the status in plain words

`'downloadable'` means nothing to most people.

In `describeAvailability()`, write a `switch` with one `case` per status, each returning its own sentence.

<details>
  <summary>Solution: <code>describeAvailability()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export function describeAvailability(status: ModelStatus): string {
  switch (status) {
    case 'available':
      return 'The model is on this device. A session starts in moments.';
    case 'downloadable':
      return 'This device can run the model, but it must be downloaded first.';
    case 'downloading':
      return 'The model is downloading. Creating a session waits for it.';
    case 'unavailable':
      return 'This device cannot run the model with these options.';
    case 'missing':
      return 'This browser has no Prompt API. Use the simulation or another browser.';
  }
}
```

</details>

## 2. Check the model

In `checkModel()`, return `'missing'` when `LanguageModel` is not defined. Otherwise return `LanguageModel.availability(modelOptions)`.

<details>
  <summary>Solution: <code>checkModel()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export async function checkModel(): Promise<ModelStatus> {
  if (typeof LanguageModel === 'undefined') return 'missing';
  return LanguageModel.availability(modelOptions);
}
```

</details>

### Try it

1. In section **A**, click **Check model status**.
   - With a fresh simulation the badge says **downloadable**, with your sentence below it.

## 3. Listen for download progress

`create()` takes a `monitor` function. The browser calls it with an object that fires `downloadprogress` events. `event.loaded` goes from `0` to `1`.

In `progressMonitor()`, return that function. In it, listen for `downloadprogress` and pass `event.loaded` to `onProgress`.

<details>
  <summary>Hint · skeleton: <code>progressMonitor()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export function progressMonitor(
  onProgress: (loaded: number) => void,
): CreateMonitorCallback {
  return (monitor) => {
    /* on every 'downloadprogress' event, report event.loaded */
  };
}
```

</details>

<details>
  <summary>Solution: <code>progressMonitor()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export function progressMonitor(
  onProgress: (loaded: number) => void,
): CreateMonitorCallback {
  return (monitor) => {
    monitor.addEventListener('downloadprogress', (event) => {
      onProgress(event.loaded);
    });
  };
}
```

</details>

## 4. Prepare the model

In `prepareModel()`:

- If `checkModel()` says `'missing'` or `'unavailable'`, throw an `Error` with the sentence from Step 1.
- Call `LanguageModel.create()` with `modelOptions`, the `signal` and `monitor: progressMonitor(onProgress)`.
- If the signal aborted while `create()` was running (`signal.aborted`), call `session.destroy()` and then `signal.throwIfAborted()`.

> **Warning:** Without `signal`, **Cancel** does nothing. Without `monitor`, the bar never appears.

<details>
  <summary>Hint · skeleton: <code>prepareModel()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export async function prepareModel(
  onProgress: (loaded: number) => void,
  signal: AbortSignal,
): Promise<LanguageModel> {
  const status = /* Step 2 */;
  if (/* missing or unavailable */)
    throw new Error(/* Step 1's sentence */);

  const session = await LanguageModel.create({
    /* modelOptions, signal, monitor */
  });

  if (/* Cancel was pressed while create() ran */) {
    /* release the late session, then throw the abort error */
  }
  return session;
}
```

</details>

<details>
  <summary>Solution: <code>prepareModel()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export async function prepareModel(
  onProgress: (loaded: number) => void,
  signal: AbortSignal,
): Promise<LanguageModel> {
  // 4a · Never start a download that cannot succeed.
  const status = await checkModel();
  if (status === 'missing' || status === 'unavailable')
    throw new Error(describeAvailability(status));

  // 4b · Create the session. For 'downloadable' this downloads the model first.
  const session = await LanguageModel.create({
    ...modelOptions,
    signal,
    monitor: progressMonitor(onProgress),
  });

  // 4c · The user pressed Cancel, but create() still finished: release it.
  if (signal.aborted) {
    session.destroy();
    signal.throwIfAborted();
  }
  return session;
}
```

</details>

### Try it

1. In section **B**, click **Prepare model**.
   - The bar fills and the badge says **Session ready**.
2. Reload the page, click **Prepare model** again and press **Cancel** halfway: the log says `prepareModel(): cancelled`.

Chrome only starts a download after a user action, which is why this runs from a click.

## 5. Release the model

A session keeps the model in memory.

In `releaseModel()`, destroy the session. Accept `undefined` too.

<details>
  <summary>Solution: <code>releaseModel()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export function releaseModel(session: LanguageModel | undefined): void {
  session?.destroy();
}
```

</details>

### Try it

1. Click **Prepare model**, then **Release model**.
   - The badge goes back to **No session**.
   - The downloaded model stays on the device, so the next **Prepare model** is instant.

---

## Check your work

```sh
pnpm lab:check 1-3
```

All 9 checks should pass.

Stuck?

- `pnpm lab:solve 1-3` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 1-3` restores the starter.

| You see                                       | What to do                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| The bar jumps straight to 100 %               | The model is already on the device. In the simulation, reload the page.           |
| **Cancel** does nothing                       | Pass `signal` to `LanguageModel.create()`.                                        |
| **Session ready**, but the bar never appeared | Pass `monitor` to `create()` and call `onProgress(event.loaded)` in the listener. |
| The bar never moves in native Chrome          | Look at `chrome://on-device-internals` and check the free disk space.             |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `ai/prompt/prompt.api.ts` creates sessions the same way, behind **AI Inspector → Setup → Prepare Prompt model**.

## Bonus

- Prepare a Summarizer the same way. Its `create()` takes `monitor` and `signal` too.
- Add a timeout: `AbortSignal.any([signal, AbortSignal.timeout(60_000)])`.
