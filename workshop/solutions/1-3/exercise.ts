// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1.3 · Downloading and initializing a model — SOLUTION
// Copy into place with: pnpm lab:solve 1-3
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * STEP 2 · Feature-detect the Prompt API, then ask availability() with
 * modelOptions. Return 'missing' instead of throwing when it is not exposed.
 */
export async function checkModel(): Promise<ModelStatus> {
  if (typeof LanguageModel === 'undefined') return 'missing';
  return LanguageModel.availability(modelOptions);
}

/**
 * STEP 3 · Build the `monitor` callback for create(). The browser calls it
 * once with a monitor object; listen there for 'downloadprogress' events and
 * report event.loaded (a number from 0 to 1) to onProgress.
 */
export function progressMonitor(
  onProgress: (loaded: number) => void,
): CreateMonitorCallback {
  return (monitor) => {
    monitor.addEventListener('downloadprogress', (event) => {
      onProgress(event.loaded);
    });
  };
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

/**
 * STEP 5 · Release the model's memory when the page no longer needs it.
 * It must be safe to call with `undefined`.
 */
export function releaseModel(session: LanguageModel | undefined): void {
  session?.destroy();
}
