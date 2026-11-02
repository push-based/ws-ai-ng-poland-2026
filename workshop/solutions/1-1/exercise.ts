// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1.1 · Local, cloud or hybrid from measured cost — SOLUTION
// Copy into place with: pnpm lab:solve 1-1
// ─────────────────────────────────────────────────────────────────────────────

/** The session we measure reads and writes English text. */
export const measureOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/**
 * GIVEN · Creates a plain Prompt API session. Nothing to change here: you
 * write this routine yourself in exercises 1.3 and 2.1.
 */
export async function createSession(
  signal?: AbortSignal,
): Promise<LanguageModel> {
  if (typeof LanguageModel === 'undefined')
    throw new Error(
      'The Prompt API is not exposed by this browser. Turn on the simulation.',
    );
  if ((await LanguageModel.availability(measureOptions)) === 'unavailable')
    throw new Error('The Prompt API cannot run English text on this device.');
  return LanguageModel.create({ ...measureOptions, signal });
}

/** What one prompt "cost" on the device. */
export interface Measurement {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  answer: string;
}

/** Token counts are what a cloud provider would bill you for. */
export type TokenUsage = Pick<Measurement, 'inputTokens' | 'outputTokens'>;

/** A price list: US dollars per one million tokens. */
export interface PricePerMillion {
  inputPerMillion: number;
  outputPerMillion: number;
}

/**
 * EXAMPLE numbers only, not any real provider's price list. Prices differ per
 * model and change often: type in your provider's current prices on the page.
 */
export const examplePrices: PricePerMillion = {
  inputPerMillion: 0.5,
  outputPerMillion: 2,
};

export interface CloudCost {
  perRequest: number;
  perMonth: number;
}

/** What we know about a feature before choosing where its AI should run. */
export interface ArchitectureNeeds {
  localAvailability: Availability | 'missing';
  dataIsSensitive: boolean;
  mustWorkOffline: boolean;
  needsLargeModel: boolean;
}

export type Architecture = 'local' | 'cloud' | 'hybrid';

export interface ArchitectureDecision {
  architecture: Architecture;
  reason: string;
}

/**
 * STEP 1 · Measure one prompt: tokens in, tokens out, and how long it took.
 * Use session.measureContextUsage() for token counts and performance.now()
 * around session.prompt() for the latency.
 */
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

/**
 * STEP 2 · Estimate what the same traffic would cost in the cloud.
 * Prices are per ONE MILLION tokens, and input and output have different prices.
 */
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

/**
 * STEP 3 · Decide where the AI part of a feature should run.
 * Rules, checked in this order:
 *   1. The device cannot run a local model           → cloud
 *   2. Large model, nothing private, always online    → cloud
 *   3. Large model, but private data or offline use   → hybrid
 *   4. Everything else                                → local
 */
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
