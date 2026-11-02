/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1.3 · Downloading and initializing a model
// Guide: workshop/exercises/1-3-model-download.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/1-3 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 1-3
// ─────────────────────────────────────────────────────────────────────────────
import { todo } from '../../shared/todo';

/** We will prompt in English and expect English answers. */
export const modelOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

export type ModelStatus = Availability | 'missing';

/**
 * STEP 1 · Explain a status in plain words for the person using the page.
 * Handle all five values: the four availability() answers and 'missing'.
 */
export function describeAvailability(status: ModelStatus): string {
  // TODO Step 1: return one sentence per status (use a switch).
  return todo('1-3', 'Step 1 (describeAvailability)');
}

/**
 * STEP 2 · Feature-detect the Prompt API, then ask availability() with
 * modelOptions. Return 'missing' instead of throwing when it is not exposed.
 */
export async function checkModel(): Promise<ModelStatus> {
  // TODO Step 2: typeof LanguageModel, then LanguageModel.availability(modelOptions).
  return todo('1-3', 'Step 2 (checkModel)');
}

/**
 * STEP 3 · Build the `monitor` callback for create(). The browser calls it
 * once with a monitor object; listen there for 'downloadprogress' events and
 * report event.loaded (a number from 0 to 1) to onProgress.
 */
export function progressMonitor(
  onProgress: (loaded: number) => void,
): CreateMonitorCallback {
  // TODO Step 3: return (monitor) => { monitor.addEventListener(...) }.
  return todo('1-3', 'Step 3 (progressMonitor)');
}

/**
 * STEP 4 · Prepare the model: check it, refuse 'missing' and 'unavailable'
 * with a clear Error, then create a session with the monitor and the signal.
 * If the signal was aborted while create() was running, destroy the session.
 */
export async function prepareModel(
  onProgress: (loaded: number) => void,
  signal: AbortSignal,
): Promise<LanguageModel> {
  // TODO Step 4: checkModel(), LanguageModel.create({ ...modelOptions, signal, monitor }).
  return todo('1-3', 'Step 4 (prepareModel)');
}

/**
 * STEP 5 · Release the model's memory when the page no longer needs it.
 * It must be safe to call with `undefined`.
 */
export function releaseModel(session: LanguageModel | undefined): void {
  // TODO Step 5: destroy the session if there is one.
  todo('1-3', 'Step 5 (releaseModel)');
}
