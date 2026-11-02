import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, simulate, step } from './harness';
import {
  chunkOptions,
  createSummarizer,
  fitsInQuota,
  longDocument,
  splitIntoChunks,
  summarizeEach,
  summarizeLarge,
  type Stage,
} from '../../apps/movie-theater/src/app/lab/exercises/3-3-large-documents/exercise';

/** Record every summarizer created during a test: its options, summarize() calls and destroy() calls. */
function trackSummarizers(t: TestContext) {
  const created: {
    options: SummarizerCreateOptions;
    summaries: number;
    destroyed: number;
  }[] = [];
  // Keep a reference: the simulation removes the global before this test's cleanup runs.
  const api = Summarizer;
  const original = api.create;
  Object.defineProperty(api, 'create', {
    configurable: true,
    writable: true,
    value: async (options: SummarizerCreateOptions) => {
      const summarizer = await original.call(api, options);
      const entry = { options, summaries: 0, destroyed: 0 };
      const destroy = summarizer.destroy.bind(summarizer);
      const run = summarizer.summarize.bind(summarizer);
      summarizer.destroy = () => {
        entry.destroyed++;
        destroy();
      };
      summarizer.summarize = (...args: Parameters<Summarizer['summarize']>) => {
        entry.summaries++;
        return run(...args);
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

const words = (text: string) => text.split(/\s+/).filter(Boolean);
const paragraphs = longDocument.split(/\n\s*\n/);

test('Step 1 · fitsInQuota measures the text and compares it with the quota', async (t) => {
  simulate(t); // simulated inputQuota: 1024 tokens
  const summarizer = await createSummarizer(chunkOptions);
  t.after(() => summarizer.destroy());
  const budget = await step('Step 1 (fitsInQuota)', () =>
    fitsInQuota(summarizer, longDocument),
  );
  assert.equal(
    budget.usage,
    estimateTokens(longDocument),
    'set usage from summarizer.measureInputUsage(text)',
  );
  assert.equal(
    budget.quota,
    1024,
    'use summarizer.inputQuota when no quota is given',
  );
  assert.equal(
    budget.fits,
    false,
    'fits must be false when usage is larger than the quota',
  );
  const small = await fitsInQuota(summarizer, 'A short note.');
  assert.equal(small.fits, true, 'fits must be true when usage <= quota');
  const custom = await fitsInQuota(summarizer, 'A short note.', 2);
  assert.equal(custom.quota, 2, 'use the quota parameter when it is given');
  assert.equal(
    custom.fits,
    false,
    'compare with the quota parameter when it is given',
  );
});

test('Step 2 · splitIntoChunks keeps paragraphs whole and packs them up to maxChars', async () => {
  const chunks = await step('Step 2 (splitIntoChunks)', () =>
    splitIntoChunks(longDocument, 900),
  );
  assert.ok(
    Array.isArray(chunks) && chunks.length > 1,
    'return an array of several chunks',
  );
  for (const chunk of chunks)
    assert.ok(
      chunk.length <= 900,
      `a chunk has ${chunk.length} characters: keep every chunk <= maxChars`,
    );
  assert.deepEqual(
    words(chunks.join(' ')),
    words(longDocument),
    'keep every word, in order (no word may be lost or cut)',
  );
  for (const paragraph of paragraphs)
    assert.ok(
      chunks.some((chunk) => chunk.includes(paragraph.trim())),
      'a paragraph that fits must stay whole in one chunk',
    );
  assert.ok(
    chunks.length < paragraphs.length,
    'pack neighbouring paragraphs together with pack(pieces, "\\n\\n", maxChars)',
  );
  assert.deepEqual(
    splitIntoChunks('Short text. Two sentences.', 900),
    ['Short text. Two sentences.'],
    'a text that fits is one chunk',
  );
});

test('Step 2 · splitIntoChunks falls back to sentences, then to whole words', async () => {
  const paragraph =
    'The first sentence is about dragons. The second sentence is about rabbits. The third one is about machines.';
  const chunks = await step('Step 2 (splitIntoChunks)', () =>
    splitIntoChunks(paragraph, 80),
  );
  assert.ok(chunks.length >= 2, 'split a paragraph longer than maxChars');
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 80, 'keep every chunk <= maxChars');
    assert.match(
      chunk,
      /\.$/,
      'split a long paragraph between sentences (use sentencesOf), not in the middle of one',
    );
  }
  assert.deepEqual(
    words(chunks.join(' ')),
    words(paragraph),
    'keep every word, in order',
  );
  const sentence = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
  const pieces = splitIntoChunks(sentence, 40);
  for (const piece of pieces)
    assert.ok(
      piece.length <= 40,
      'split a very long sentence into groups of whole words',
    );
  assert.deepEqual(
    words(pieces.join(' ')),
    words(sentence),
    'never cut a word: split on spaces only',
  );
});

test('Step 3 · summarizeEach summarizes every chunk in order and reports it', async (t) => {
  simulate(t);
  const summarizer = await createSummarizer(chunkOptions);
  t.after(() => summarizer.destroy());
  const stages: Stage[] = [];
  const chunks = [
    'Dragons fly over the city. A traveller watches.',
    'A rabbit sleeps. Birds arrive.',
  ];
  const summaries = await step('Step 3 (summarizeEach)', () =>
    summarizeEach(summarizer, chunks, (stage) => stages.push(stage)),
  );
  assert.equal(summaries.length, 2, 'return one summary per chunk');
  assert.match(
    summaries[0],
    /Dragons/,
    'keep the summaries in the order of the chunks',
  );
  assert.match(
    summaries[1],
    /rabbit/,
    'keep the summaries in the order of the chunks',
  );
  assert.equal(stages.length, 2, 'call onStage once for every chunk');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    summarizeEach(summarizer, chunks, () => undefined, controller.signal),
    { name: 'AbortError' },
    'pass the signal on (or call signal.throwIfAborted()) so Stop works between chunks',
  );
});

test('Step 4 · summarizeLarge reduces a document bigger than the quota, then writes the final summary', async (t) => {
  simulate(t, { inputQuota: 300 });
  const created = trackSummarizers(t);
  const stages: Stage[] = [];
  const summary = await step('Step 4 (summarizeLarge)', () =>
    summarizeLarge(longDocument, (stage) => stages.push(stage)),
  );
  assert.equal(typeof summary, 'string');
  assert.ok(summary.length > 0, 'return the final summary');
  const mapper = created.find((entry) => entry.options.type === 'key-points');
  const finisher = created.find((entry) => entry.options.type === 'tldr');
  assert.ok(mapper, 'create a summarizer with chunkOptions for the chunks');
  assert.ok(
    finisher,
    'create a summarizer with finalOptions for the final summary',
  );
  assert.ok(
    mapper.summaries >= 3,
    'summarize the chunks with summarizeEach() while the text is too large',
  );
  assert.equal(finisher.summaries, 1, 'write exactly one final summary');
  assert.ok(
    stages.length > mapper.summaries,
    'report the measure/split/final stages with onStage, too',
  );
  for (const entry of created)
    assert.equal(
      entry.destroyed,
      1,
      'destroy every summarizer you created (finally)',
    );
});

test('Step 4 · summarizeLarge skips chunking when the text fits, and respects quotaOverride', async (t) => {
  simulate(t, { inputQuota: 4000 });
  const created = trackSummarizers(t);
  // First make sure Step 4 is implemented, so the counts below are real.
  await step('Step 4 (summarizeLarge)', () =>
    summarizeLarge(longDocument, () => undefined),
  );
  const direct = created.find((entry) => entry.options.type === 'key-points');
  assert.equal(
    direct?.summaries ?? 0,
    0,
    'a text that fits needs no chunk summaries: go straight to the final summary',
  );
  await summarizeLarge(longDocument, () => undefined, undefined, 300);
  const pretend = created
    .filter((entry) => entry.options.type === 'key-points')
    .at(-1);
  assert.ok(
    (pretend?.summaries ?? 0) > 0,
    'use Math.min(inputQuota, quotaOverride) as the quota',
  );
  for (const entry of created)
    assert.equal(
      entry.destroyed,
      1,
      'destroy every summarizer you created (finally)',
    );
});
