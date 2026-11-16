# Exercise 1.1: Local, cloud or hybrid from measured cost

Measure what one prompt takes on the device, turn the numbers into a cloud bill, and write the rules that decide where a feature's AI runs.

- **Page:** http://127.0.0.1:4200/lab/1-1
- **You edit:** `apps/movie-theater/src/app/lab/exercises/1-1-cloud-vs-local/exercise.ts`
- **Check:** `pnpm lab:check 1-1`
- **Time:** ~20 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`createSession()` is given. You write the three functions below it.

## 1. Measure one prompt

A token is a small piece of text, roughly four characters in English. Tokens are what a cloud provider bills. Latency is what the user feels.

In `measurePrompt()`:

- Count the question's tokens with `session.measureContextUsage(text, { signal })` before you send it.
- Read `performance.now()` right before and right after `await session.prompt(text, { signal })`.
- Nothing counts output tokens, so measure the answer with `measureContextUsage(answer)`.
- Return `{ inputTokens, outputTokens, latencyMs, answer }`.

<details>
  <summary>Hint · skeleton: <code>measurePrompt()</code></summary>

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

<details>
  <summary>Solution: <code>measurePrompt()</code></summary>

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

</details>

### Try it

1. In section **A**, click **Create session**, then **Measure this prompt**.
   - The simulation shows 16 input and 36 output tokens.
2. Measure the three suggestions too.
   - The context counter grows each time, because the session keeps the whole conversation.

## 2. Turn tokens into a cloud bill

Cloud prices are per one million tokens, with separate prices for input and output:

```text
cost per request = (input tokens × input price + output tokens × output price) ÷ 1,000,000
```

In `estimateCloudCost()`, return `{ perRequest, perMonth }`, where `perMonth` is `perRequest × requestsPerMonth`.

<details>
  <summary>Solution: <code>estimateCloudCost()</code></summary>

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

### Try it

1. Click **End session**, **Create session**, the **In two sentences: what makes an animated…** suggestion and **Measure this prompt**.
2. Click **Estimate cost** in section **B**.
   - The simulation shows $0.00008 per request and $8.00 per month for 100000 requests.

The prices on the page are example numbers, so type in your provider's. The device row shows $0, but local AI still costs a model download, storage and battery.

## 3. Local, cloud or hybrid?

Hybrid means the device does the private or simple part and the cloud does the rest. Four rules, checked in order. The first match wins:

| #   | If…                                                 | Then       |
| --- | --------------------------------------------------- | ---------- |
| 1   | the local model is `'missing'` or `'unavailable'`   | **cloud**  |
| 2   | large model needed, data not private, always online | **cloud**  |
| 3   | large model needed (private data or offline use)    | **hybrid** |
| 4   | anything else                                       | **local**  |

In `chooseArchitecture()`, return `{ architecture, reason }` for the first rule that matches. `'downloadable'` and `'downloading'` count as "can run locally". In rule 1, when `mustWorkOffline` is true, the reason must say that the AI part cannot work offline.

<details>
  <summary>Hint · skeleton: <code>chooseArchitecture()</code></summary>

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

<details>
  <summary>Solution: <code>chooseArchitecture()</code></summary>

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

### Try it

In section **C**, click **Use this browser's answer**, set up each row and click **Decide**:

| Feature idea                              | Tick                  | Badge      |
| ----------------------------------------- | --------------------- | ---------- |
| Short summary of the user's private notes | private               | **LOCAL**  |
| Legal analysis of a long public contract  | large model           | **CLOUD**  |
| Medical letter explained in detail        | private + large model | **HYBRID** |
| Row 1 again, with `unavailable` above     | private               | **CLOUD**  |

The last row is the uncomfortable one: private data would have to leave the device. A real product then asks for consent or offers a non-AI version. Exercise 1.4 builds that fallback.

---

## Check your work

```sh
pnpm lab:check 1-1
```

All 6 checks should pass.

Stuck?

- `pnpm lab:solve 1-1` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 1-1` restores the starter.

| You see                                         | What to do                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `session.measureContextUsage is not a function` | Your Chrome uses the old name `measureInputUsage`. Update Chrome or use simulation. |
| `perRequest` is a million times too big         | Divide the weighted token sum by `1_000_000`.                                       |
| The decision is always `local`                  | Check that `canRunLocally` is `false` for `'missing'` and `'unavailable'`.          |
| **Per request** shows a tiny amount             | Expected: one prompt is small. Read **Per month**.                                  |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `features/concierge/concierge-session.service.ts` shows `contextUsage / contextWindow` as a context meter.

## Bonus

- Let `estimateCloudCost()` take a conversation length: a cloud chat re-sends the whole history with every request.
- In rule 1, add a consent reminder to `reason` when the data is private.
- Measure the same prompt five times. Is the first one slower?
