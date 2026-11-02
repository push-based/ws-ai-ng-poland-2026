import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  configureSimulation,
  simulate,
  spy,
  step,
  withoutGlobal,
} from './harness';
import {
  checkModel,
  describeAvailability,
  modelOptions,
  prepareModel,
  progressMonitor,
  releaseModel,
} from '../../apps/movie-theater/src/app/lab/exercises/1-3-model-download/exercise';

/** Await a promise that should reject with AbortError; a 🧩 todo is reported as such. */
async function expectAbort(pending: Promise<unknown>, message: string) {
  const error = await pending.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (error instanceof Error && error.message.startsWith('🧩')) throw error;
  assert.equal((error as Error | undefined)?.name, 'AbortError', message);
}

const statuses = [
  'available',
  'downloadable',
  'downloading',
  'unavailable',
  'missing',
] as const;

test('Step 1 · describeAvailability explains every status in its own words', async () => {
  const texts = [];
  for (const status of statuses) {
    const text = await step('Step 1 (describeAvailability)', () =>
      describeAvailability(status),
    );
    assert.equal(
      typeof text,
      'string',
      `describeAvailability('${status}') should return a string`,
    );
    assert.ok(text.trim().length > 10, `write a full sentence for '${status}'`);
    texts.push(text);
  }
  assert.equal(
    new Set(texts).size,
    statuses.length,
    'each status needs a different sentence',
  );
});

test('Step 2 · checkModel asks availability() with modelOptions', async (t) => {
  simulate(t, { availability: 'downloadable' });
  const availability = spy(t, LanguageModel, 'availability');
  const status = await step('Step 2 (checkModel)', () => checkModel());
  assert.equal(
    status,
    'downloadable',
    'return the answer of LanguageModel.availability()',
  );
  assert.deepEqual(
    availability.calls[0]?.[0],
    modelOptions,
    'pass modelOptions to availability()',
  );
});

test("Step 2 · checkModel returns 'missing' when the Prompt API is not exposed", async (t) => {
  simulate(t);
  await step('Step 2 (checkModel)', () => checkModel());
  const status = await withoutGlobal('LanguageModel', () => checkModel());
  assert.equal(
    status,
    'missing',
    "check typeof LanguageModel first and return 'missing' (no ReferenceError)",
  );
});

test('Step 3 · progressMonitor reports downloadprogress events', async () => {
  const seen: number[] = [];
  const callback = await step('Step 3 (progressMonitor)', () =>
    progressMonitor((loaded) => seen.push(loaded)),
  );
  assert.equal(
    typeof callback,
    'function',
    'return a function: (monitor) => { ... }',
  );
  const monitor = new EventTarget() as CreateMonitor;
  callback(monitor);
  for (const loaded of [0, 0.5, 1])
    monitor.dispatchEvent(
      Object.assign(new Event('downloadprogress'), { loaded, total: 1 }),
    );
  assert.deepEqual(
    seen,
    [0, 0.5, 1],
    "listen for 'downloadprogress' on the monitor and pass event.loaded to onProgress",
  );
});

test('Step 4 · prepareModel downloads with progress and returns a session', async (t) => {
  simulate(t, { availability: 'downloadable' });
  const create = spy(t, LanguageModel, 'create');
  const seen: number[] = [];
  const controller = new AbortController();
  const session = await step('Step 4 (prepareModel)', () =>
    prepareModel((loaded) => seen.push(loaded), controller.signal),
  );
  t.after(() => session.destroy());
  const options = create.calls[0]?.[0] as
    | LanguageModelCreateOptions
    | undefined;
  assert.ok(options, 'call LanguageModel.create()');
  assert.deepEqual(
    options.expectedInputs,
    modelOptions.expectedInputs,
    'spread modelOptions into create()',
  );
  assert.equal(
    options.signal,
    controller.signal,
    'pass the signal to create(), so Cancel can stop the download',
  );
  assert.equal(
    typeof options.monitor,
    'function',
    'pass monitor: progressMonitor(onProgress) to create()',
  );
  assert.ok(
    seen.length >= 2,
    'onProgress should be called during the simulated download',
  );
  assert.equal(
    seen.at(-1),
    1,
    'the last progress value of a finished download is 1',
  );
  assert.equal(
    typeof (await session.prompt('Hello')),
    'string',
    'return a working session',
  );
});

test("Step 4 · prepareModel refuses 'unavailable' and 'missing' with a clear Error", async (t) => {
  simulate(t, { availability: 'available' });
  (
    await step('Step 4 (prepareModel)', () =>
      prepareModel(() => undefined, new AbortController().signal),
    )
  ).destroy();
  configureSimulation({ availability: 'unavailable' });
  const create = spy(t, LanguageModel, 'create');
  await assert.rejects(
    prepareModel(() => undefined, new AbortController().signal),
    Error,
    "throw an Error when checkModel() says 'unavailable'",
  );
  assert.equal(
    create.calls.length,
    0,
    "do not call create() when the status is 'unavailable'",
  );
  await withoutGlobal('LanguageModel', () =>
    assert.rejects(
      prepareModel(() => undefined, new AbortController().signal),
      (error: Error) => !(error instanceof ReferenceError),
      "throw a readable Error for 'missing', not a ReferenceError",
    ),
  );
});

test('Step 4 · Cancel during the download rejects with AbortError', async (t) => {
  simulate(t, { availability: 'downloadable', downloadMs: 200 });
  const controller = new AbortController();
  const pending = step('Step 4 (prepareModel)', () =>
    prepareModel((loaded) => {
      if (loaded > 0) controller.abort();
    }, controller.signal),
  );
  await expectAbort(
    pending,
    'pass the signal to create(); aborting it must reject prepareModel() with AbortError',
  );
});

test('Step 4 · a session that arrives after Cancel is destroyed', async (t) => {
  simulate(t, { availability: 'downloadable', downloadMs: 50 });
  // Pretend to be a browser that ignores the signal and finishes create() anyway.
  const model = LanguageModel;
  const original = model.create;
  let created: LanguageModel | undefined;
  Object.defineProperty(model, 'create', {
    configurable: true,
    writable: true,
    value: async (options: LanguageModelCreateOptions) => {
      created = await original.call(model, { ...options, signal: undefined });
      return created;
    },
  });
  t.after(() =>
    Object.defineProperty(model, 'create', {
      configurable: true,
      writable: true,
      value: original,
    }),
  );
  const controller = new AbortController();
  const pending = step('Step 4 (prepareModel)', () =>
    prepareModel((loaded) => {
      if (loaded > 0) controller.abort();
    }, controller.signal),
  );
  await expectAbort(
    pending,
    'after create(), call signal.throwIfAborted() when the signal is aborted',
  );
  assert.ok(created, 'create() should have been called');
  await assert.rejects(
    created.prompt('Still there?'),
    /destroyed/,
    'destroy the late session before throwing',
  );
});

test('Step 5 · releaseModel destroys the session and accepts undefined', async (t) => {
  simulate(t, { availability: 'available' });
  const session = await LanguageModel.create(modelOptions);
  await step('Step 5 (releaseModel)', () => releaseModel(session));
  await assert.rejects(
    session.prompt('Still there?'),
    /destroyed/,
    'call session.destroy()',
  );
  assert.doesNotThrow(
    () => releaseModel(undefined),
    'releaseModel(undefined) must not throw',
  );
});
