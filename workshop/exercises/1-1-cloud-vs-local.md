# Exercise 1.1: Local, cloud or hybrid from measured cost

Every AI feature has to run somewhere: in the browser on the user's device, on a cloud model, or split between the two. In this exercise we will measure what one prompt takes on the device, turn those numbers into a cloud bill, and write the rules that place a feature's AI locally, in the cloud or as a hybrid.

**Page:** http://127.0.0.1:4200/lab/1-1 · **You edit:** `apps/movie-theater/src/app/lab/exercises/1-1-cloud-vs-local/exercise.ts` · **Check:** `pnpm lab:check 1-1` · **Time:** ~20 min · **Level:** core

## Goal

At the end of this exercise **Decide** places a feature's AI as **LOCAL**, **CLOUD** or **HYBRID** with a reason, and you back that choice with the tokens, latency and monthly cloud bill you measured on the same page.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/1-1 in Chrome. If the page says **NO BUILT-IN AI DETECTED**, turn on **Use simulated browser AI**: the simulation gives simple, predictable answers, so everything in this exercise still works.

Open `exercise.ts`. `createSession()` near the top is given: it creates a Prompt API session for you, and you write that routine yourself in exercises 1.3 and 2.1. You write the three functions below it, each of which still calls `todo('1-1', …)`.

Three terms we will use throughout:

| Term               | Meaning                                                                                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Token**          | Models do not read letters or whole words. They read _tokens_: small pieces of text. For English, one token is roughly four characters. Cloud providers bill per token, separately for input (your prompt) and output (the answer).            |
| **Context window** | The maximum number of tokens a session can hold at once: system prompt, every question and every answer. When it is full, older turns must go (exercise 2.4). On a session, `contextUsage` is what is used and `contextWindow` is the maximum. |
| **Latency**        | The time from sending the prompt to getting the answer. In the cloud it includes the network round trip. On the device there is no network, but the speed depends on the user's hardware.                                                      |

## 1. Measure one prompt: tokens and latency

Before we can compare local and cloud, we need the two numbers a cloud provider would bill and a user would feel: tokens and milliseconds.

In `measurePrompt()`, count the question's tokens with `session.measureContextUsage(text, { signal })` before you send it. Read `performance.now()` right before and right after `await session.prompt(text, { signal })`; the difference is the latency. There is no method that counts output tokens, so measure the answer with `measureContextUsage(answer)` as if it were input. That approximation is close enough for a cost estimate. Return `{ inputTokens, outputTokens, latencyMs, answer }`.

> [!WARNING]
> `measureContextUsage()` is the current name. Older Chrome versions call it `measureInputUsage()`. If the log says `session.measureContextUsage is not a function`, update Chrome or turn on **Use simulated browser AI**, and keep `measureContextUsage()` in your code.

<details>
  <summary>measurePrompt() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-1-cloud-vs-local/exercise.ts
export async function measurePrompt(
  session: LanguageModel,
  text: string,
  signal?: AbortSignal,
): Promise<Measurement> {
  const inputTokens = /* tokens of the question, before sending */;

  const started = performance.now();
  const answer = /* ask the model */;
  const latencyMs = /* whole milliseconds since started */;

  const outputTokens = /* tokens of the answer, measured as input */;

  return { inputTokens, outputTokens, latencyMs, answer };
}
```

</details>

Fill in four expressions: `await session.measureContextUsage(text, { signal })`, `await session.prompt(text, { signal })`, `Math.round(performance.now() - started)`, and `measureContextUsage()` once more on `answer`. Keep the timer tight around `prompt()` so it times only the model's work.

<details>
  <summary>measurePrompt() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-1-cloud-vs-local/exercise.ts
export async function measurePrompt(
  session: LanguageModel,
  text: string,
  signal?: AbortSignal,
): Promise<Measurement> {
  // 1a · How many tokens will the question take? Measure BEFORE sending.
  const inputTokens = await session.measureContextUsage(text, { signal });

  // 1b · Time only the model's work.
  const started = performance.now();
  const answer = await session.prompt(text, { signal });
  const latencyMs = Math.round(performance.now() - started);

  // 1c · Approximation: measure the answer as if it were input.
  const outputTokens = await session.measureContextUsage(answer, { signal });

  return { inputTokens, outputTokens, latencyMs, answer };
}
```

| Code                                    | Meaning                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `measureContextUsage(text, { signal })` | Counts tokens with the model's own tokenizer. Nothing is generated and nothing is sent.      |
| `performance.now()`                     | Milliseconds since the page started, with fractions. Better than `Date.now()` for durations. |
| `Math.round(...)`                       | Whole milliseconds are enough for a table.                                                   |
| `{ signal }`                            | An optional `AbortSignal`, so the page can cancel the request (exercise 2.2).                |

</details>

Save, and in section **A** click **Create session** (the badge switches to **Session active**), then **Measure this prompt**. A row appears with input tokens, output tokens and latency. In the simulation, the default prompt gives 16 input tokens and 36 output tokens, and the counter next to the buttons reads `52 / 4096 tokens in this session's context`. The simulation counts tokens as characters ÷ 4 and waits a fixed 250 ms per prompt; native Chrome gives real numbers from your device.

Now click each of the three suggestion buttons, **In two sentences: what makes an animated…**, **Say hi.** and **Write a 150-word programme note for an o…**, and measure each one. Compare the shortest prompt with the longest answer:

> `Say hi.` → \_\_\_ ms · 150-word programme note → \_\_\_ ms

Watch the context counter too: it grows after every prompt, because the session keeps the whole conversation. Most cloud chat APIs are stateless: you send the whole history with every request, and you pay for it every time.

## 2. Turn tokens into a cloud bill

The device sends no bill, so the cloud price is the number we compare it against. Cloud price lists are written per one million tokens, and input and output tokens have separate prices:

```text
cost per request = (input tokens × input price + output tokens × output price) ÷ 1,000,000
```

In `estimateCloudCost()`, compute `perRequest` with that formula from `usage` and `prices`, and return it together with `perMonth`, which is `perRequest × requestsPerMonth`.

> [!WARNING]
> Prices are per one million tokens. Divide the weighted sum by `1_000_000` once, before you multiply by the requests per month, or `perRequest` comes out a million times too big. (`1_000_000` is `1000000`; the underscores only make it readable.)

<details>
  <summary>estimateCloudCost() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-1-cloud-vs-local/exercise.ts
export function estimateCloudCost(
  usage: TokenUsage,
  prices: PricePerMillion,
  requestsPerMonth: number,
): CloudCost {
  const perRequest =
    (usage.inputTokens * prices.inputPerMillion +
      usage.outputTokens * prices.outputPerMillion) /
    1_000_000;
  return { perRequest, perMonth: perRequest * requestsPerMonth };
}
```

</details>

Section **B** prices your latest row from section A, so let's make that row the default prompt again, in a fresh session so the answer does not quote an earlier question. Click **End session**, **Create session**, the **In two sentences: what makes an animated…** suggestion, then **Measure this prompt**. Click **Estimate cost**. With the page's example prices ($0.5 input and $2 output per 1M tokens) and 100000 requests per month, the simulation's 16 + 36 tokens give:

| Row                  | Per request | Per month |
| -------------------- | ----------- | --------- |
| Cloud API (estimate) | $0.00008    | $8.00     |
| On this device       | $0.00       | $0.00     |

With native Chrome your token counts differ, so write down your own: per request → $\_\_\_ · per month → $\_\_\_. Change **Requests per month** to `1000000` and click **Estimate cost** again; in the simulation the monthly figure becomes $80.00.

> [!NOTE]
> The prices on the page are example numbers (`examplePrices` in the file), not any provider's price list. Prices differ per model and change often: type in your provider's current prices.

Read the note under the table: "zero token cost" is not "zero cost". On-device AI still needs a one-time model download, storage, battery and the user's CPU/GPU, and not every device can run it. The app's footer says the same: _"Initial downloads and device resources still apply."_

## 3. Local, cloud or hybrid?

With tokens, latency and a bill in hand, we can place a feature. There are three ways to place the AI part of a feature:

| Architecture            | What it means                                                                                    | Good for                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Local** (local-first) | The model runs in the browser on the user's device.                                              | Privacy, offline use, no bill per request, no network delay |
| **Cloud** (cloud-first) | Your server or an AI provider runs a large model.                                                | Hard tasks, broad knowledge, devices without a local model  |
| **Hybrid**              | The device does the private or simple part (filter, redact, summarize), the cloud does the rest. | Hard tasks on private data; working partly offline          |

We turn this into four rules, checked in order. The first rule that matches wins:

| #   | If…                                                         | Then       | Why                                                                                    |
| --- | ----------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| 1   | the local model is `'missing'` or `'unavailable'`           | **cloud**  | Nothing can run on this device. If offline is required, the AI part needs a fallback.  |
| 2   | it needs a large model, the data is not private, and online | **cloud**  | Nothing to protect, and the big model gives the best result.                           |
| 3   | it needs a large model (and the data is private or offline) | **hybrid** | Keep private data and offline work on the device; send only what is left to the cloud. |
| 4   | anything else                                               | **local**  | The device can do it: private, offline-capable, no bill per request.                   |

In `chooseArchitecture()`, apply these four rules to `needs` and return `{ architecture, reason }` for the first one that matches. `'downloadable'` and `'downloading'` count as "can run locally": the model isn't on the device yet, but it can run there soon.

<details>
  <summary>chooseArchitecture() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-1-cloud-vs-local/exercise.ts
export function chooseArchitecture(
  needs: ArchitectureNeeds,
): ArchitectureDecision {
  const canRunLocally = /* availability is neither 'missing' nor 'unavailable' */;

  // Rule 1
  if (/* no local model */)
    return { architecture: 'cloud', reason: /* mention the offline fallback when mustWorkOffline */ };

  // Rule 2
  if (/* large model, nothing private, online */)
    return { architecture: 'cloud', reason: /* … */ };

  // Rule 3
  if (/* large model */)
    return { architecture: 'hybrid', reason: /* … */ };

  // Rule 4
  return { architecture: 'local', reason: /* … */ };
}
```

</details>

Rule 1 tests `!canRunLocally`. Rule 2 needs all three of `needs.needsLargeModel`, `!needs.dataIsSensitive` and `!needs.mustWorkOffline`. Rule 3 only tests `needs.needsLargeModel`, because rule 2 has already taken the public, online case. Give every branch a reason a user can read; when rule 1 fires with `mustWorkOffline`, say that offline the page shows the non-AI fallback.

<details>
  <summary>chooseArchitecture() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/1-1-cloud-vs-local/exercise.ts
export function chooseArchitecture(
  needs: ArchitectureNeeds,
): ArchitectureDecision {
  // 'downloadable' and 'downloading' still count: the model can run here soon.
  const canRunLocally =
    needs.localAvailability !== 'missing' &&
    needs.localAvailability !== 'unavailable';

  // Rule 1 · No local model: only a server can do the AI part.
  if (!canRunLocally)
    return {
      architecture: 'cloud',
      reason: needs.mustWorkOffline
        ? 'This device cannot run the model, so AI needs the network. Offline, show the non-AI fallback.'
        : 'This device cannot run the model, so the AI part has to run on a server.',
    };

  // Rule 2 · A hard task with nothing to protect: the big cloud model is simplest.
  if (needs.needsLargeModel && !needs.dataIsSensitive && !needs.mustWorkOffline)
    return {
      architecture: 'cloud',
      reason:
        'The task needs a large model, the data is not private and the user is online.',
    };

  // Rule 3 · A hard task with private data or offline use: split the work.
  if (needs.needsLargeModel)
    return {
      architecture: 'hybrid',
      reason:
        'Do the private or offline part locally (filter, redact, summarize). Send only what is left to the cloud when online.',
    };

  // Rule 4 · Everything else stays on the device.
  return {
    architecture: 'local',
    reason:
      'The device can run it: no bill per request, data stays on the device, works offline once downloaded.',
  };
}
```

</details>

Save. In section **C**, click **Use this browser's answer** to fill in the real availability, then set up each feature below and click **Decide** after each one:

| Feature idea                                  | Tick                  | Badge      |
| --------------------------------------------- | --------------------- | ---------- |
| Short summary of the user's private notes     | private               | **LOCAL**  |
| Legal analysis of a long public contract      | large model           | **CLOUD**  |
| Medical letter explained in detail            | private + large model | **HYBRID** |
| Same as row 1, but choose `unavailable` above | private (+ offline)   | **CLOUD**  |

Great job! Rule 1 is the uncomfortable one: when a device cannot run a model, private data would have to leave it. A real product must then ask for consent, or offer a non-AI version. Exercise 1.4 builds that fallback.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 1-1
```

Expected result:

```
  ✔ Step 1 · measurePrompt counts input and output tokens with measureContextUsage()
  ✔ Step 1 · measurePrompt times session.prompt() with performance.now()
  ✔ Step 2 · estimateCloudCost prices input and output tokens per million
  ✔ Step 3 · chooseArchitecture keeps work local when the device can run it
  ✔ Step 3 · chooseArchitecture uses the cloud when there is no local model
  ✔ Step 3 · chooseArchitecture splits large-model work into hybrid when data is private or offline

  6 passed, 0 failed
```

The check runs your file in Node against the simulated AI. It verifies that you call the right APIs and that the math and the rules are right. It does not judge real prices or a real model's speed.

### Troubleshooting

| You see                                                   | What to do                                                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🧩 `Not implemented yet: exercise 1-1, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                                                                                |
| `The Prompt API is not exposed by this browser`           | Use desktop Chrome, check `/preflight`, or turn on **Use simulated browser AI**.                                                                                         |
| **Create session** takes a long time                      | Chrome is downloading the model. Follow it in `chrome://on-device-internals`. Exercise 1.3 adds a progress bar.                                                          |
| `session.measureContextUsage is not a function`           | Your Chrome still uses the previous name `measureInputUsage`. Update Chrome, or turn on the simulation.                                                                  |
| **Per request** shows a tiny amount such as `$0.00008`    | That is expected: prices are per million tokens and one prompt is small. Read **Per month**, or raise **Requests per month**.                                            |
| `perRequest` is a million times too big                   | Divide the weighted token sum by `1_000_000`.                                                                                                                            |
| The decision is always `local`                            | Rules 1–3 never fire. Check that `canRunLocally` is `false` for `'missing'` and `'unavailable'`, and that rules 2 and 3 test `needs.needsLargeModel` (not its negation). |
| The page did not change after saving                      | Check the app's terminal for a compile error. It names the file and the line.                                                                                            |

Still stuck? `pnpm lab:solve 1-1` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 1-1` brings back the starter file.

> [!NOTE]
> The cinema app makes the same trade-offs visible. `apps/movie-theater/src/app/features/concierge/concierge-session.service.ts` shows `contextUsage / contextWindow` as a context meter. `apps/movie-theater/src/app/app.html` has the footer's "Local AI. No cloud inference bill.\*" and its footnote about downloads and device resources. The root `README.md` → _Browser preparation_ lists the storage and hardware Chrome documents for its built-in model: the real cost of "free" local inference.

## 4. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Change `estimateCloudCost()` to also take a conversation length: in a cloud chat, request _n_ re-sends the whole history. How fast does the bill grow?
- In rule 1, add a consent reminder to `reason` when `dataIsSensitive` is `true`.
- Measure the same prompt five times in a fresh session and compare the latencies. Is the first one slower than the rest?
