/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1.1 · Local, cloud or hybrid from measured cost
// Guide: workshop/exercises/1-1-cloud-vs-local.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/1-1 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 1-1
// ─────────────────────────────────────────────────────────────────────────────
import { todo } from '../../shared/todo';

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
  // TODO Step 1: measure the input, time prompt(), measure the answer.
  return todo('1-1', 'Step 1 (measurePrompt)');
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
  // TODO Step 2: return { perRequest, perMonth }.
  return todo('1-1', 'Step 2 (estimateCloudCost)');
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
  // TODO Step 3: apply the four rules above, in order.
  return todo('1-1', 'Step 3 (chooseArchitecture)');
}
