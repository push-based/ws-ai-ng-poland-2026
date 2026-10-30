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
  basicExcerpt,
  detectEnhancement,
  shortDescription,
  summaryOptions,
} from '../../apps/movie-theater/src/app/lab/exercises/1-4-progressive-enhancement/exercise';

const notes = movies[0].notes.join(' ');

/** Record every Summarizer.create() call: its options and whether the summarizer was destroyed. */
function trackSummarizers(t: TestContext) {
  const model = Summarizer;
  const original = model.create;
  const made: { options?: SummarizerCreateOptions; destroyed: boolean }[] = [];
  Object.defineProperty(model, 'create', {
    configurable: true,
    writable: true,
    value: async (options?: SummarizerCreateOptions) => {
      const summarizer = await original.call(model, options);
      const entry = { options, destroyed: false };
      made.push(entry);
      const destroy = summarizer.destroy.bind(summarizer);
      summarizer.destroy = () => {
        entry.destroyed = true;
        destroy();
      };
      return summarizer;
    },
  });
  t.after(() =>
    Object.defineProperty(model, 'create', {
      configurable: true,
      writable: true,
      value: original,
    }),
  );
  return made;
}

test("Step 1 · detectEnhancement returns 'ai' when the Summarizer can run these options", async (t) => {
  simulate(t);
  const availability = spy(t, Summarizer, 'availability');
  const result = await step('Step 1 (detectEnhancement)', () =>
    detectEnhancement(),
  );
  assert.equal(
    result,
    'ai',
    "an available (or downloadable) Summarizer → 'ai'",
  );
  assert.deepEqual(
    availability.calls[0]?.[0],
    summaryOptions,
    'pass summaryOptions to Summarizer.availability()',
  );
  configureSimulation({ availability: 'downloadable' });
  assert.equal(
    await detectEnhancement(),
    'ai',
    "'downloadable' still means the AI version can be offered",
  );
});

test("Step 1 · detectEnhancement returns 'basic' when there is no usable Summarizer", async (t) => {
  simulate(t);
  await step('Step 1 (detectEnhancement)', () => detectEnhancement());
  configureSimulation({ availability: 'unavailable' });
  assert.equal(
    await detectEnhancement(),
    'basic',
    "availability 'unavailable' → 'basic'",
  );
  assert.equal(
    await withoutGlobal('Summarizer', () => detectEnhancement()),
    'basic',
    "no Summarizer global → 'basic' (check typeof Summarizer first, so there is no ReferenceError)",
  );
  configureSimulation({ availability: 'available' });
  const model = Summarizer;
  const original = model.availability;
  Object.defineProperty(model, 'availability', {
    configurable: true,
    writable: true,
    value: () => Promise.reject(new Error('check failed')),
  });
  t.after(() =>
    Object.defineProperty(model, 'availability', {
      configurable: true,
      writable: true,
      value: original,
    }),
  );
  assert.equal(
    await detectEnhancement(),
    'basic',
    "if availability() throws, return 'basic' (try/catch)",
  );
});

test('Step 2 · basicExcerpt keeps the first sentences', async () => {
  const text = 'First sentence. Second one! Is this the third? Fourth.';
  const two = await step('Step 2 (basicExcerpt)', () => basicExcerpt(text, 2));
  assert.equal(
    two,
    'First sentence. Second one!',
    'keep exactly the first two sentences, separated by one space',
  );
  assert.equal(
    basicExcerpt(text, 1),
    'First sentence.',
    'use maxSentences, do not hard-code 2',
  );
  assert.equal(
    basicExcerpt(text, 10),
    text,
    'asking for more sentences than exist returns the whole text',
  );
  assert.equal(
    basicExcerpt('  no punctuation here  ', 2),
    'no punctuation here',
    'text without . ! ? counts as one (trimmed) sentence',
  );
});

test('Step 3 · shortDescription uses the Summarizer where it is available, then destroys it', async (t) => {
  simulate(t);
  const created = trackSummarizers(t);
  const result = await step('Step 3 (shortDescription)', () =>
    shortDescription(notes),
  );
  assert.equal(
    result.source,
    'ai',
    "with an available Summarizer, source should be 'ai'",
  );
  assert.ok(
    result.text.length > 0 && result.text.length < notes.length,
    'return the summary text',
  );
  const options = created[0]?.options;
  assert.equal(
    options?.type,
    summaryOptions.type,
    'create the summarizer with ...summaryOptions',
  );
  assert.equal(
    options?.format,
    summaryOptions.format,
    'create the summarizer with ...summaryOptions',
  );
  assert.equal(created.length, 1, 'create one summarizer per call');
  assert.equal(
    created[0].destroyed,
    true,
    'destroy the summarizer in a finally block',
  );
});

test('Step 3 · shortDescription falls back to the basic excerpt without AI', async (t) => {
  simulate(t);
  await step('Step 3 (shortDescription)', () => shortDescription(notes));
  const expected = { source: 'basic', text: basicExcerpt(notes, 2) };
  assert.deepEqual(
    await withoutGlobal('Summarizer', () => shortDescription(notes)),
    expected,
    "no Summarizer → { source: 'basic', text: basicExcerpt(text, 2) }",
  );
  configureSimulation({ availability: 'unavailable' });
  assert.deepEqual(
    await shortDescription(notes),
    expected,
    "an 'unavailable' Summarizer → the basic excerpt",
  );
});

test('Step 3 · shortDescription falls back on ANY failure and still cleans up', async (t) => {
  simulate(t);
  await step('Step 3 (shortDescription)', () => shortDescription(notes));
  const created = trackSummarizers(t);
  configureSimulation({ inputQuota: 5 });
  const tooLong = await shortDescription(notes);
  assert.equal(
    tooLong.source,
    'basic',
    'when summarize() throws (here: input too large), return the basic excerpt',
  );
  assert.equal(
    created.at(-1)?.destroyed,
    true,
    'destroy the summarizer even when summarize() throws (finally)',
  );
  configureSimulation({ inputQuota: 1024 });
  const controller = new AbortController();
  controller.abort();
  const cancelled = await shortDescription(notes, controller.signal);
  assert.equal(
    cancelled.source,
    'basic',
    'a cancelled AI call also falls back, so the card is never empty',
  );
});
