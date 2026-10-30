# Exercise 1.3: Downloading and initializing a model

The built-in model is not part of your page: Chrome downloads it once per device, and the first page that asks has to wait for it. In this exercise we will build the button that checks the model, downloads it with a live progress bar, lets the viewer cancel, and hands back a session we can release again.

**Page:** http://127.0.0.1:4200/lab/1-3 · **You edit:** `apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts` · **Check:** `pnpm lab:check 1-3` · **Time:** ~15 min · **Level:** core

## Goal

At the end of this exercise a cancellable **Prepare model** button downloads the Prompt model with a live progress bar and ends in **Session ready**.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/1-3 in Chrome. If the page says **NO BUILT-IN AI DETECTED**, turn on **Use simulated browser AI**: the simulation fakes a 1600 ms download with progress events at 0, 20, 45, 70, 90 and 100 %, so you can watch your progress bar work.

Open `exercise.ts`. `modelOptions` (English text in and out) and the `ModelStatus` type at the top are given. You write the five functions below them, each of which still calls `todo('1-3', …)`.

The model is not part of your page. Chrome downloads it once per device, stores it in the browser profile and shares it between sites. Your code only:

1. asks `availability(options)`: is it here, downloadable, or impossible?
2. calls `create(options)`, which downloads the model first if needed. It reports progress through a `monitor`, can be cancelled with a `signal`, and resolves with a session;
3. calls `session.destroy()` when it is done.

## 1. Explain the status in plain words

`'downloadable'` means nothing to most people, so we turn each state into a sentence. `ModelStatus` has five values: the four `availability()` answers and our own `'missing'`.

In `describeAvailability()`, write a `switch` over `status` with one `case` per value, each returning its own sentence. With a `case` for every value, TypeScript checks that you handled them all.

<details>
  <summary>describeAvailability() solution</summary>

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

The page shows your sentence from Step 2 onwards. For now, run `pnpm lab:check 1-3` in a second terminal: the `Step 1 · describeAvailability explains every status in its own words` line turns ✔.

## 2. Check the model

Before we offer a download, we need to know whether one is possible. These are the same two checks as in exercise 1.2: feature detection (`typeof LanguageModel`), then capability detection with the exact options we will use later, `modelOptions`.

In `checkModel()`, return `'missing'` when `LanguageModel` is not defined, and otherwise return `LanguageModel.availability(modelOptions)`.

<details>
  <summary>checkModel() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export async function checkModel(): Promise<ModelStatus> {
  if (typeof LanguageModel === 'undefined') return 'missing';
  return LanguageModel.availability(modelOptions);
}
```

</details>

Save. In section **A**, click **Check model status**. With the simulation freshly on, the badge says **downloadable** and your sentence from Step 1 appears below it. If it says **available**, an earlier exercise already ran the simulated download: switch **Use simulated browser AI** off and on, and click again.

## 3. Listen for download progress

A download without feedback looks like a frozen page. `create()` accepts a `monitor` option for this. It is a function: the browser calls it once, right away, with a _monitor_ object. That object fires a `downloadprogress` event while the model downloads, and `event.loaded` is a number from `0` to `1` (0 % to 100 %).

In `progressMonitor()`, return that `monitor` function. Inside it, listen for `downloadprogress` on the monitor and pass `event.loaded` to `onProgress`.

<details>
  <summary>progressMonitor() skeleton</summary>

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

It is a function that returns a function: `progressMonitor(onProgress)` builds the callback now, and the browser calls it later with the monitor. The body is one `monitor.addEventListener('downloadprogress', …)` call whose listener calls `onProgress(event.loaded)`.

<details>
  <summary>progressMonitor() solution</summary>

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

Nothing calls this until Step 4. Run `pnpm lab:check 1-3` again: `Step 3 · progressMonitor reports downloadprogress events` turns ✔.

## 4. Prepare the model: check, download, cancel

Now we put it together into the function behind **Prepare model**. In `prepareModel()`:

- Refuse early. If `checkModel()` says `'missing'` or `'unavailable'`, `create()` cannot succeed, so throw an `Error` with the sentence from Step 1.
- Call `LanguageModel.create()` with the same `modelOptions` you checked, the `signal`, and the `monitor` from Step 3.
- A browser can still finish `create()` after you aborted. Nobody will use that session, so destroy it at once and throw the abort error.

> [!WARNING]
> Pass both `signal` and `monitor: progressMonitor(onProgress)` to `LanguageModel.create()`. Without `signal`, **Cancel** does nothing; without `monitor`, the badge says **Session ready** but the bar never appears.

> [!TIP]
> Start `create()` from a click. Chrome needs a user action before it starts a model download, and the page calls `prepareModel()` from the **Prepare model** click handler. `availability()` downloads nothing, so you can call it at any time.

<details>
  <summary>prepareModel() skeleton</summary>

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

Spread `...modelOptions` into the `create()` options and add `signal` and `monitor: progressMonitor(onProgress)`. After `create()` resolves, check `signal.aborted`; when it is `true`, call `session.destroy()` and then `signal.throwIfAborted()`.

<details>
  <summary>prepareModel() solution</summary>

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

| Code                                            | Meaning                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `throw new Error(describeAvailability(status))` | A readable reason instead of a `create()` that cannot succeed.                                                  |
| `signal`                                        | **Cancel** calls `abort()` on it, which stops the download.                                                     |
| `monitor: progressMonitor(onProgress)`          | Wires Step 3's listener into the download, so the bar moves.                                                    |
| `signal.throwIfAborted()`                       | Throws the signal's reason, an `AbortError` by default. The page shows that as "cancelled", not as a red error. |

</details>

Save. In section **B**:

1. Click **Prepare model**. In the simulation, the bar fills to 100 % over 1600 ms, then the badge says **Session ready**. The log shows how many tokens are in context, and whether the click counted as a _user activation_.
2. Section **A**'s badge now says **available**: the model stays on the device after one download. In the simulation, the next `create()` reports 100 % at once, with no download wait.
3. To see the download again in the simulation, reload the page. That clears the session (**Release model** only works after Step 5) and starts the simulation over from **downloadable**. Click **Prepare model** and press **Cancel** halfway (around 45 %). The log says `prepareModel(): cancelled`.

Well done! With native Chrome, a model that is already on the device needs no download, so you see little or no progress. Do the first native download before class, on a good network, and follow it on `chrome://on-device-internals`:

> First native download → \_\_\_ s

## 5. Release the model

A session keeps the model loaded in the device's memory. `session.destroy()` releases it.

In `releaseModel()`, destroy the session. Accept `undefined`, because the page also calls it when no session exists.

<details>
  <summary>releaseModel() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise.ts
export function releaseModel(session: LanguageModel | undefined): void {
  session?.destroy();
}
```

</details>

Save. Click **Prepare model**, then **Release model**. The badge goes back to **No session**. Releasing a session keeps the downloaded model on the device: in the simulation, the next **Prepare model** jumps straight to 100 % with no download wait, compared with 1600 ms for the first one.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 1-3
```

Expected result:

```
  ✔ Step 1 · describeAvailability explains every status in its own words
  ✔ Step 2 · checkModel asks availability() with modelOptions
  ✔ Step 2 · checkModel returns 'missing' when the Prompt API is not exposed
  ✔ Step 3 · progressMonitor reports downloadprogress events
  ✔ Step 4 · prepareModel downloads with progress and returns a session
  ✔ Step 4 · prepareModel refuses 'unavailable' and 'missing' with a clear Error
  ✔ Step 4 · Cancel during the download rejects with AbortError
  ✔ Step 4 · a session that arrives after Cancel is destroyed
  ✔ Step 5 · releaseModel destroys the session and accepts undefined

  9 passed, 0 failed
```

The check runs your file in Node against the simulated AI, including a simulated download with progress events and a simulated browser that finishes `create()` after Cancel.

### Troubleshooting

| You see                                                   | What to do                                                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 1-3, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                                              |
| `NotAllowedError` when preparing                          | The download needs a user action. Start it from the button click, as the page does.                                                    |
| The bar jumps straight to 100 %                           | The model is already on the device (status **available**). In the simulation, switch it off and on, or reload the page, to start over. |
| The bar never moves in native Chrome                      | Look up the download state on `chrome://on-device-internals`, and check the free disk space (see the root `README.md`).                |
| **Cancel** does nothing                                   | Pass `signal` to `LanguageModel.create()`.                                                                                             |
| **Session ready**, but the bar never appeared             | Pass `monitor: progressMonitor(onProgress)` to `create()` (Step 4), and call `onProgress(event.loaded)` in the listener (Step 3).      |
| The page did not change after saving                      | Check the app's terminal for a compile error. It names the file and the line.                                                          |

Still stuck? `pnpm lab:solve 1-3` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 1-3` brings back the starter file.

> [!NOTE]
> The cinema app prepares its models the same way. `apps/movie-theater/src/app/ai/prompt/prompt.api.ts` calls `create()` with `signal` and `monitor`, and destroys a session that resolves after cancellation. In `apps/movie-theater/src/app/ai/ai-runtime.service.ts`, `downloadMonitor()` ignores progress events from cancelled work, and `require()` refuses `'unavailable'`. **AI Inspector → Setup → Prepare Prompt model** in the cinema runs the same flow with a real progress bar.

## 6. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Show `describeAvailability('downloading')` while the bar is moving, then switch to "Ready" when `create()` resolves.
- Prepare a Summarizer the same way. Its `create()` accepts `monitor` and `signal` too.
- Add a timeout: `AbortSignal.any([signal, AbortSignal.timeout(60_000)])` cancels automatically after one minute.
