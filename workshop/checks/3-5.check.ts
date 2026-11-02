import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  configureSimulation,
  simulate,
  spy,
  step,
  withoutGlobal,
} from './harness';
import {
  commentContext,
  exampleNotes,
  proofreadComment,
  rewriteComment,
  writeComment,
  writerOptions,
} from '../../apps/movie-theater/src/app/lab/exercises/3-5-writing-assistance/exercise';

interface Model {
  destroy(): void;
}

/** Record every model created through `api.create()`, its options and how often it was destroyed. */
function track<M extends Model>(
  t: TestContext,
  api: { create(options?: never): Promise<M> },
) {
  const created: {
    options: Record<string, unknown>;
    destroyed: number;
    calls: unknown[][];
  }[] = [];
  const original = api.create as (options?: unknown) => Promise<M>;
  Object.defineProperty(api, 'create', {
    configurable: true,
    writable: true,
    value: async (options?: Record<string, unknown>) => {
      const model = await original.call(api, options);
      const entry = {
        options: options ?? {},
        destroyed: 0,
        calls: [] as unknown[][],
      };
      const destroy = model.destroy.bind(model);
      model.destroy = () => {
        entry.destroyed++;
        destroy();
      };
      for (const method of ['write', 'rewrite', 'proofread'] as const) {
        const target = model as unknown as Record<
          string,
          (...args: unknown[]) => unknown
        >;
        const run = target[method];
        if (typeof run === 'function')
          target[method] = (...args: unknown[]) => {
            entry.calls.push(args);
            return run.apply(model, args);
          };
      }
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

test('Step 1 · writeComment drafts a comment from the notes with the Writer', async (t) => {
  simulate(t);
  const availability = spy(t, Writer, 'availability');
  const created = track(t, Writer);
  const controller = new AbortController();
  const comment = await step('Step 1 (writeComment)', () =>
    writeComment(exampleNotes, controller.signal),
  );
  assert.equal(typeof comment, 'string');
  assert.ok(
    comment.length > exampleNotes.length / 2,
    'return the text of writer.write()',
  );
  assert.deepEqual(
    availability.calls[0]?.[0],
    writerOptions,
    'call Writer.availability(writerOptions) before create()',
  );
  assert.equal(created.length, 1, 'create one Writer');
  assert.equal(
    created[0].options['sharedContext'],
    commentContext,
    'create the Writer with writerOptions (it contains sharedContext)',
  );
  assert.equal(
    created[0].options['signal'],
    controller.signal,
    'pass the signal to Writer.create()',
  );
  const [input, options] = created[0].calls[0] as [string, WriterWriteOptions];
  assert.equal(input, exampleNotes, 'send the notes as the input of write()');
  assert.ok(
    options?.context,
    'add a { context } telling the model to keep only the viewer’s opinions',
  );
  assert.equal(
    created[0].destroyed,
    1,
    'destroy the Writer in a finally block',
  );
});

test('Step 2 · rewriteComment creates a Rewriter with the chosen tone', async (t) => {
  simulate(t);
  const created = track(t, Rewriter);
  const formal = await step('Step 2 (rewriteComment)', () =>
    rewriteComment("It's awesome and I don't regret it.", 'more-formal'),
  );
  assert.equal(
    created[0]?.options['tone'],
    'more-formal',
    'pass the tone to Rewriter.create()',
  );
  assert.deepEqual(
    created[0].options['expectedInputLanguages'],
    ['en'],
    'declare expectedInputLanguages: ["en"]',
  );
  assert.match(formal, /do not/, 'return the text of rewriter.rewrite()');
  assert.equal(
    (created[0].calls[0] as [string])[0],
    "It's awesome and I don't regret it.",
    'rewrite the text parameter',
  );
  const casual = await rewriteComment('A remarkable film.', 'more-casual');
  assert.match(
    casual,
    /awesome/,
    'a new tone needs a new Rewriter: build the options from the tone parameter',
  );
  assert.ok(
    created.every((entry) => entry.destroyed === 1),
    'destroy every Rewriter in a finally block',
  );
});

test('Step 3 · proofreadComment returns the corrected text and the number of corrections', async (t) => {
  simulate(t);
  const created = track(t, Proofreader);
  const result = await step('Step 3 (proofreadComment)', () =>
    proofreadComment('I realy liked teh film.'),
  );
  assert.equal(
    result.corrected,
    'I really liked the film.',
    'return result.correctedInput as `corrected`',
  );
  assert.equal(
    result.corrections,
    2,
    'return result.corrections.length as `corrections`',
  );
  assert.deepEqual(
    created[0]?.options['expectedInputLanguages'],
    ['en'],
    'create the Proofreader with proofreaderOptions',
  );
  assert.equal(
    created[0].destroyed,
    1,
    'destroy the Proofreader in a finally block',
  );
});

test('Steps 1–3 · each function explains a missing or unavailable API', async (t) => {
  simulate(t);
  // First make sure all three steps are implemented, so the failures below are real failures.
  await step('Step 1 (writeComment)', () => writeComment('nice film'));
  await step('Step 2 (rewriteComment)', () =>
    rewriteComment('Nice film.', 'as-is'),
  );
  await step('Step 3 (proofreadComment)', () => proofreadComment('Nice film.'));
  const readable = (error: Error) => !(error instanceof ReferenceError);
  await withoutGlobal('Writer', () =>
    assert.rejects(
      writeComment('x'),
      readable,
      'check `typeof Writer` first: throw a readable Error, not a ReferenceError',
    ),
  );
  await withoutGlobal('Rewriter', () =>
    assert.rejects(
      rewriteComment('x', 'as-is'),
      readable,
      'check `typeof Rewriter` first: throw a readable Error',
    ),
  );
  await withoutGlobal('Proofreader', () =>
    assert.rejects(
      proofreadComment('x'),
      readable,
      'check `typeof Proofreader` first: throw a readable Error',
    ),
  );
  configureSimulation({ availability: 'unavailable' });
  await assert.rejects(
    writeComment('x'),
    Error,
    'throw an Error when Writer.availability() is "unavailable"',
  );
  await assert.rejects(
    rewriteComment('x', 'as-is'),
    Error,
    'throw an Error when Rewriter.availability() is "unavailable"',
  );
  await assert.rejects(
    proofreadComment('x'),
    Error,
    'throw an Error when Proofreader.availability() is "unavailable"',
  );
});
