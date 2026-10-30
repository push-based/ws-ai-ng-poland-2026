// Shared helpers for `pnpm lab:check <id>`. Each check runs a participant's
// exercise file in Node against the simulated built-in AI, so the checks work on
// any laptop. They test the code's contract (right API, right options, cleanup),
// not the quality of a real model's answers.
import type { TestContext } from 'node:test';
import {
  type SimulationConfig,
  installSimulatedAi,
  uninstallSimulatedAi,
} from '../../apps/movie-theater/src/app/lab/shared/simulated-ai';
import { isTodo } from '../../apps/movie-theater/src/app/lab/shared/todo';

export {
  configureSimulation,
  estimateTokens,
  SimulatedModelContext,
} from '../../apps/movie-theater/src/app/lab/shared/simulated-ai';
export { movies, getMovie } from '../../libs/catalogue/src/index';

/** Install fast simulated AI for one test and remove it afterwards. */
export function simulate(
  t: TestContext,
  overrides: Partial<SimulationConfig> = {},
): void {
  installSimulatedAi({
    availability: 'available',
    downloadMs: 20,
    latencyMs: 1,
    chunkDelayMs: 1,
    ...overrides,
  });
  t.after(() => uninstallSimulatedAi());
}

/**
 * Run one exercise step. If the step still calls todo(), fail with a short,
 * friendly message instead of a stack trace.
 */
export async function step<T>(
  name: string,
  work: () => T | Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isTodo(error))
      throw new Error(
        `🧩 ${name} is not implemented yet: replace the todo(...) line.`,
      );
    throw error;
  }
}

/** Wrap a static method on a global (e.g. LanguageModel.create) to record its calls. */
export function spy<T extends object, K extends keyof T>(
  t: TestContext,
  target: T,
  key: K,
): { calls: unknown[][] } {
  const original = target[key] as unknown as (...args: unknown[]) => unknown;
  const record = { calls: [] as unknown[][] };
  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value: function (this: unknown, ...args: unknown[]) {
      record.calls.push(args);
      return original.apply(this, args);
    },
  });
  t.after(() =>
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      value: original,
    }),
  );
  return record;
}

/** Hide a browser global while `work` runs, to check feature detection. */
export async function withoutGlobal<T>(
  name: string,
  work: () => Promise<T> | T,
): Promise<T> {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  delete (globalThis as Record<string, unknown>)[name];
  try {
    return await work();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  }
}

/** Read a whole ReadableStream<string> into one string. */
export async function readAll(stream: ReadableStream<string>): Promise<string> {
  let text = '';
  for await (const chunk of stream as unknown as AsyncIterable<string>)
    text += chunk;
  return text;
}
