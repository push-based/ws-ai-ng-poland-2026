import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  configureSimulation,
  getMovie,
  simulate,
  spy,
  step,
  withoutGlobal,
} from './harness';
import {
  canTranslate,
  detectLanguage,
  translateCues,
} from '../../apps/movie-theater/src/app/lab/exercises/3-4-translation/exercise';

interface Model {
  destroy(): void;
}

/** Record every model created through `api.create()` and how often it was destroyed. */
function track<M extends Model>(
  t: TestContext,
  api: { create(options?: unknown): Promise<M> },
) {
  const created: { model: M; options: unknown; destroyed: number }[] = [];
  const original = api.create;
  Object.defineProperty(api, 'create', {
    configurable: true,
    writable: true,
    value: async (options?: unknown) => {
      const model = await original.call(api, options);
      const entry = { model, options, destroyed: 0 };
      const destroy = model.destroy.bind(model);
      model.destroy = () => {
        entry.destroyed++;
        destroy();
      };
      created.push(entry);
      return model;
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

function movie(id: string) {
  const found = getMovie(id);
  if (!found) throw new Error(`The catalogue has no movie "${id}"`);
  return found;
}
const dream = movie('dream'); // has dialogue
const bunny = movie('bunny'); // no dialogue: an empty caption track

test('Step 1 · detectLanguage returns the most likely language and destroys the detector', async (t) => {
  simulate(t);
  const created = track(t, LanguageDetector);
  const controller = new AbortController();
  const result = await step('Step 1 (detectLanguage)', () =>
    detectLanguage('Szukam zabawnego filmu na wieczór.', controller.signal),
  );
  assert.equal(
    result.language,
    'pl',
    'return results[0].detectedLanguage as `language`',
  );
  assert.ok(
    result.confidence > 0.5,
    'return results[0].confidence as `confidence`',
  );
  assert.equal(created.length, 1, 'create one LanguageDetector');
  assert.equal(
    (created[0].options as { signal?: AbortSignal })?.signal,
    controller.signal,
    'pass { signal } to LanguageDetector.create()',
  );
  assert.equal(
    created[0].destroyed,
    1,
    'destroy the detector in a finally block',
  );
  assert.equal(
    (await detectLanguage('Ich suche einen Film.')).language,
    'de',
    'detect German as "de"',
  );
});

test('Step 1 · detectLanguage falls back to "und" and explains a missing API', async (t) => {
  simulate(t);
  const created = track(t, LanguageDetector);
  // First make sure Step 1 is implemented, so the failures below are real failures.
  await step('Step 1 (detectLanguage)', () => detectLanguage('Hello there.'));
  const api = LanguageDetector;
  const create = api.create;
  api.create = async (options) => {
    const detector = await create.call(api, options);
    detector.detect = async () => [];
    return detector;
  };
  try {
    assert.deepEqual(
      await detectLanguage('???'),
      { language: 'und', confidence: 0 },
      'return { language: "und", confidence: 0 } when detect() returns no result',
    );
  } finally {
    api.create = create;
  }
  assert.ok(
    created.every((entry) => entry.destroyed === 1),
    'destroy every detector',
  );
  await withoutGlobal('LanguageDetector', () =>
    assert.rejects(
      detectLanguage('Hello'),
      (error: Error) => !(error instanceof ReferenceError),
      'check `typeof LanguageDetector` first, so a missing API gives a readable Error, not a ReferenceError',
    ),
  );
});

test('Step 2 · canTranslate checks availability for exactly this language pair', async (t) => {
  simulate(t);
  const availability = spy(t, Translator, 'availability');
  const result = await step('Step 2 (canTranslate)', () =>
    canTranslate('en', 'pl'),
  );
  assert.equal(
    result,
    'available',
    'return what Translator.availability() answers',
  );
  assert.deepEqual(
    availability.calls[0]?.[0],
    { sourceLanguage: 'en', targetLanguage: 'pl' },
    'pass { sourceLanguage: source, targetLanguage: target } to Translator.availability()',
  );
  assert.equal(
    await canTranslate('en', 'tlh'),
    'unavailable',
    'return "unavailable" for an unsupported pair',
  );
  assert.equal(
    await withoutGlobal('Translator', () => canTranslate('en', 'pl')),
    'missing',
    'check `typeof Translator === "undefined"` first and return "missing"',
  );
});

test('Step 3 · translateCues translates the text with ONE translator and keeps the timing', async (t) => {
  simulate(t);
  const created = track(t, Translator);
  const progress: string[] = [];
  const before = JSON.stringify(dream.captions);
  const cues = await step('Step 3 (translateCues)', () =>
    translateCues(dream.captions, 'en', 'de', (done, total) =>
      progress.push(`${done}/${total}`),
    ),
  );
  assert.equal(
    cues.length,
    dream.captions.length,
    'return one cue per input cue',
  );
  cues.forEach((cue, index) => {
    const original = dream.captions[index];
    assert.equal(
      cue.start,
      original.start,
      'copy `start` unchanged: only the text is translated',
    );
    assert.equal(
      cue.end,
      original.end,
      'copy `end` unchanged: only the text is translated',
    );
    assert.equal(
      cue.text,
      `[de] ${original.text}`,
      'translate each cue text, in order, with translator.translate()',
    );
  });
  assert.equal(
    JSON.stringify(dream.captions),
    before,
    'do not change the original cues: return new objects ({ ...cue, text })',
  );
  assert.equal(
    created.length,
    1,
    'create ONE translator and reuse it for every cue',
  );
  assert.deepEqual(
    {
      ...(created[0].options as object),
      signal: undefined,
      monitor: undefined,
    },
    {
      sourceLanguage: 'en',
      targetLanguage: 'de',
      signal: undefined,
      monitor: undefined,
    },
    'create the translator for this source/target pair',
  );
  assert.equal(
    created[0].destroyed,
    1,
    'destroy the translator in a finally block',
  );
  assert.equal(
    progress.at(-1),
    `${dream.captions.length}/${dream.captions.length}`,
    'call onProgress(done, total) after every cue',
  );
});

test('Step 3 · translateCues needs no model for an empty track or the same language', async (t) => {
  simulate(t);
  const created = track(t, Translator);
  // First make sure Step 3 is implemented, so the checks below are real.
  await step('Step 3 (translateCues)', () =>
    translateCues(dream.captions.slice(0, 1), 'en', 'pl'),
  );
  const createdBefore = created.length;
  assert.deepEqual(
    await translateCues(bunny.captions, 'en', 'pl'),
    [],
    'return [] for a movie without dialogue',
  );
  const same = await translateCues(dream.captions, 'en', 'en');
  assert.deepEqual(
    same,
    dream.captions,
    'return the cues unchanged when source === target',
  );
  assert.notEqual(
    same[0],
    dream.captions[0],
    'return copies, not the original cue objects',
  );
  assert.equal(
    created.length,
    createdBefore,
    'do not create a translator when there is nothing to translate',
  );
  configureSimulation({ availability: 'unavailable' });
  await assert.rejects(
    translateCues(dream.captions, 'en', 'pl'),
    Error,
    'throw an Error when the pair is unavailable',
  );
});
