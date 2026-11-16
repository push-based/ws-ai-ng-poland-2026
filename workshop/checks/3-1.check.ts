import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  configureSimulation,
  movies,
  simulate,
  spy,
  step,
  withoutGlobal,
} from './harness';
import {
  createSummarizer,
  englishLanguages,
  programmeNotes,
  summarize,
  summarizerAvailability,
  summaryOptions,
} from '../../apps/movie-theater/src/app/lab/exercises/3-1-summarizer/exercise';

/** Record every summarizer created during a test, and how often each one was destroyed. */
function trackSummarizers(t: TestContext) {
  const created: {
    summarizer: Summarizer;
    destroyed: number;
    calls: unknown[][];
  }[] = [];
  // Keep a reference: the simulation removes the global before this test's cleanup runs.
  const api = Summarizer;
  const original = api.create;
  Object.defineProperty(api, 'create', {
    configurable: true,
    writable: true,
    value: async (...args: Parameters<typeof Summarizer.create>) => {
      const summarizer = await original.apply(api, args);
      const entry = { summarizer, destroyed: 0, calls: [] as unknown[][] };
      const destroy = summarizer.destroy.bind(summarizer);
      const run = summarizer.summarize.bind(summarizer);
      summarizer.destroy = () => {
        entry.destroyed++;
        destroy();
      };
      summarizer.summarize = (
        ...callArgs: Parameters<Summarizer['summarize']>
      ) => {
        entry.calls.push(callArgs);
        return run(...callArgs);
      };
      created.push(entry);
      return summarizer;
    },
  });
  t.after(() =>
    Object.defineProperty(api, 'create', {
      configurable: true,
      writable: true,
      value: original,
    }),
  );
  return created;
}

const notes = programmeNotes(movies[0]);
// Steps 2–4 use literal options, so they can be checked before Step 1 is done.
const tldr: SummarizerCreateOptions = {
  expectedInputLanguages: ['en'],
  outputLanguage: 'en',
  type: 'tldr',
  length: 'short',
  format: 'plain-text',
};

test('Step 1 · summaryOptions declares type, length, format and English languages', async () => {
  const options = await step('Step 1 (summaryOptions)', () =>
    summaryOptions('key-points', 'medium', 'markdown'),
  );
  assert.equal(
    options.type,
    'key-points',
    'set options.type from the first parameter',
  );
  assert.equal(
    options.length,
    'medium',
    'set options.length from the second parameter',
  );
  assert.equal(
    options.format,
    'markdown',
    'set options.format from the third parameter',
  );
  assert.deepEqual(
    options.expectedInputLanguages,
    ['en'],
    'spread englishLanguages into the options',
  );
  assert.equal(
    options.outputLanguage,
    'en',
    'spread englishLanguages into the options (outputLanguage: "en")',
  );
  assert.equal(
    options.sharedContext,
    undefined,
    'leave sharedContext out when none is given',
  );
  const withContext = summaryOptions(
    'tldr',
    'short',
    'plain-text',
    'For a cinema website.',
  );
  assert.equal(
    withContext.sharedContext,
    'For a cinema website.',
    'copy a non-empty sharedContext into the options',
  );
  assert.equal(
    summaryOptions('tldr', 'short', 'plain-text', '  ').sharedContext,
    undefined,
    'treat an empty sharedContext as "none"',
  );
});

test('Step 2 · summarizerAvailability asks the browser with the exact options', async (t) => {
  simulate(t);
  const availability = spy(t, Summarizer, 'availability');
  const options = tldr;
  const result = await step('Step 2 (summarizerAvailability)', () =>
    summarizerAvailability(options),
  );
  assert.equal(
    result,
    'available',
    'return what Summarizer.availability() answers',
  );
  assert.deepEqual(
    availability.calls[0]?.[0],
    options,
    'pass the options to Summarizer.availability()',
  );
  const polish = await summarizerAvailability({
    ...options,
    outputLanguage: 'pl',
  });
  assert.equal(
    polish,
    'unavailable',
    'the simulation cannot write Polish: return its "unavailable" answer',
  );
  const missing = await withoutGlobal('Summarizer', () =>
    summarizerAvailability(options),
  );
  assert.equal(
    missing,
    'missing',
    'check `typeof Summarizer === "undefined"` first and return "missing"',
  );
});

test('Step 3 · createSummarizer creates with the same options, the signal and a download monitor', async (t) => {
  simulate(t, { availability: 'downloadable' });
  const availability = spy(t, Summarizer, 'availability');
  const create = spy(t, Summarizer, 'create');
  const options: SummarizerCreateOptions = {
    ...tldr,
    type: 'headline',
    sharedContext: 'Cinema notes.',
  };
  const controller = new AbortController();
  const progress: number[] = [];
  const summarizer = await step('Step 3 (createSummarizer)', () =>
    createSummarizer(options, controller.signal, (loaded) =>
      progress.push(loaded),
    ),
  );
  t.after(() => summarizer.destroy());
  assert.equal(
    availability.calls.length,
    1,
    'call summarizerAvailability() (Summarizer.availability) once before create()',
  );
  const createOptions = create.calls[0]?.[0] as SummarizerCreateOptions;
  assert.ok(createOptions, 'call Summarizer.create()');
  for (const key of [
    'type',
    'length',
    'format',
    'sharedContext',
    'outputLanguage',
  ] as const)
    assert.deepEqual(
      createOptions[key],
      options[key],
      `create() needs the same ${key} as availability()`,
    );
  assert.equal(
    createOptions.signal,
    controller.signal,
    'pass the signal to Summarizer.create()',
  );
  assert.equal(
    typeof createOptions.monitor,
    'function',
    'pass a monitor(m) function to Summarizer.create()',
  );
  assert.ok(
    progress.length > 1 && progress.at(-1) === 1,
    'listen for "downloadprogress" and call onProgress(event.loaded)',
  );
  assert.equal(summarizer.type, 'headline', 'return the created summarizer');
});

test('Step 3 · createSummarizer reports a clear error when the API is missing or unavailable', async (t) => {
  simulate(t);
  const options = tldr;
  // First make sure Step 3 is implemented, so the failures below are real failures.
  (
    await step('Step 3 (createSummarizer)', () => createSummarizer(options))
  ).destroy();
  configureSimulation({ availability: 'unavailable' });
  await assert.rejects(
    createSummarizer(options),
    Error,
    'throw an Error when availability is "unavailable"',
  );
  await withoutGlobal('Summarizer', () =>
    assert.rejects(
      createSummarizer(options),
      (error: Error) =>
        !(error instanceof ReferenceError) && /not/i.test(error.message),
      'throw a readable Error when the Summarizer is "missing" (not a ReferenceError); its message should say that the API is "not exposed"',
    ),
  );
});

test('Step 4 · summarize returns the summary, passes context and signal, and destroys the summarizer', async (t) => {
  simulate(t);
  const created = trackSummarizers(t);
  const controller = new AbortController();
  const options = tldr;
  const summary = await step('Step 4 (summarize)', () =>
    summarize(notes, options, controller.signal, 'For a family evening.'),
  );
  assert.equal(typeof summary, 'string');
  assert.ok(
    summary.length > 0 && summary.length < notes.length,
    'return the text of summarizer.summarize()',
  );
  assert.equal(
    created.length,
    1,
    'create exactly one summarizer (use createSummarizer from Step 3)',
  );
  const [input, callOptions] = created[0].calls[0] as [
    string,
    SummarizerSummarizeOptions,
  ];
  assert.equal(input, notes, 'summarize the text parameter');
  assert.equal(
    callOptions?.context,
    'For a family evening.',
    'pass { context } to summarizer.summarize()',
  );
  assert.equal(
    callOptions?.signal,
    controller.signal,
    'pass { signal } to summarizer.summarize()',
  );
  assert.equal(
    created[0].destroyed,
    1,
    'call summarizer.destroy() once the summary is ready',
  );
  assert.deepEqual(englishLanguages.expectedInputLanguages, ['en']);
});

test('Step 4 · summarize destroys the summarizer even when summarizing fails', async (t) => {
  simulate(t, { inputQuota: 10 });
  const created = trackSummarizers(t);
  const options = tldr;
  // First make sure Step 4 is implemented, so the failure below is a real failure.
  await step('Step 4 (summarize)', () => summarize('A short note.', options));
  await assert.rejects(
    summarize(notes, options),
    /too large/,
    'let the QuotaExceededError reach the caller',
  );
  assert.equal(created.length, 2);
  assert.equal(
    created[1].destroyed,
    1,
    'destroy the summarizer in a finally block, so it is released on errors too',
  );
});
