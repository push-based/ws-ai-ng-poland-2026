import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { movies, simulate, step } from './harness';
import {
  readText,
  streamOptions,
  summarizeOnce,
  summarizeStreaming,
  timedStreaming,
} from '../../apps/movie-theater/src/app/lab/exercises/3-2-streaming-summaries/exercise';

/** Record every summarizer created during a test, and how often each one was destroyed. */
function trackSummarizers(t: TestContext) {
  const created: { destroyed: number; streams: number }[] = [];
  // Keep a reference: the simulation removes the global before this test's cleanup runs.
  const api = Summarizer;
  const original = api.create;
  Object.defineProperty(api, 'create', {
    configurable: true,
    writable: true,
    value: async (...args: Parameters<typeof Summarizer.create>) => {
      const summarizer = await original.apply(api, args);
      const entry = { destroyed: 0, streams: 0 };
      const destroy = summarizer.destroy.bind(summarizer);
      const stream = summarizer.summarizeStreaming.bind(summarizer);
      summarizer.destroy = () => {
        entry.destroyed++;
        destroy();
      };
      summarizer.summarizeStreaming = (
        ...callArgs: Parameters<Summarizer['summarizeStreaming']>
      ) => {
        entry.streams++;
        return stream(...callArgs);
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

function streamOf(chunks: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

const notes = movies[0].notes.join('\n\n');

test('Step 1 · readText adds up the chunks, reports progress and releases the lock', async () => {
  const seen: string[] = [];
  const stream = streamOf(['Hel', 'lo ', 'world']);
  const text = await step('Step 1 (readText)', () =>
    readText(stream, (soFar) => seen.push(soFar)),
  );
  assert.equal(
    text,
    'Hello world',
    'add every chunk to the text and return the complete text',
  );
  assert.deepEqual(
    seen,
    ['Hel', 'Hello ', 'Hello world'],
    'call onText with the text so far after every chunk',
  );
  assert.equal(
    stream.locked,
    false,
    'call reader.releaseLock() in a finally block',
  );
  const failing = new ReadableStream<string>({
    pull(controller) {
      controller.error(new Error('model crashed'));
    },
  });
  await assert.rejects(
    readText(failing, () => undefined),
    /model crashed/,
    'let stream errors reach the caller',
  );
  assert.equal(
    failing.locked,
    false,
    'release the lock also when the stream fails (finally)',
  );
});

test('Step 1 · readText stops a waiting stream when the signal aborts', async () => {
  // First make sure Step 1 is implemented, so the failures below are real failures.
  await step('Step 1 (readText)', () =>
    readText(streamOf(['ok']), () => undefined),
  );
  let cancelled = false;
  // A stream that never sends anything: only cancelling the reader can end read().
  const stuck = new ReadableStream<string>({
    pull: () => new Promise<void>(() => undefined),
    cancel: () => {
      cancelled = true;
    },
  });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 20);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            'readText() kept waiting after abort: call reader.cancel() when the signal aborts',
          ),
        ),
      1000,
    );
  });
  try {
    await assert.rejects(
      Promise.race([
        readText(stuck, () => undefined, controller.signal),
        timeout,
      ]),
      (error: Error) => {
        if (/kept waiting/.test(error.message)) throw error;
        return error.name === 'AbortError';
      },
      'throw the AbortError after cancelling (signal.throwIfAborted())',
    );
  } finally {
    clearTimeout(timer);
  }
  assert.ok(cancelled, 'call reader.cancel() when the signal aborts');
  assert.equal(
    stuck.locked,
    false,
    'release the lock after Stop as well (finally)',
  );
});

test('Step 2 · summarizeStreaming streams the summary and destroys the summarizer', async (t) => {
  simulate(t);
  const created = trackSummarizers(t);
  const options = streamOptions('long');
  const seen: string[] = [];
  const text = await step('Step 2 (summarizeStreaming)', () =>
    summarizeStreaming(notes, options, (soFar) => seen.push(soFar)),
  );
  assert.equal(
    created[0]?.streams,
    1,
    'call summarizer.summarizeStreaming() (not summarize())',
  );
  assert.ok(
    seen.length > 1,
    'read the stream with readText() so onText is called for every chunk',
  );
  assert.equal(
    text,
    await summarizeOnce(notes, options),
    'return the whole streamed summary',
  );
  assert.equal(
    created[0].destroyed,
    1,
    'destroy the summarizer when the stream is finished',
  );
});

test('Step 2 · summarizeStreaming destroys the summarizer after Stop', async (t) => {
  simulate(t);
  const created = trackSummarizers(t);
  const options = streamOptions('long');
  // First make sure Step 2 is implemented, so the failure below is a real failure.
  await step('Step 2 (summarizeStreaming)', () =>
    summarizeStreaming('One. Two. Three.', options, () => undefined),
  );
  const controller = new AbortController();
  await assert.rejects(
    summarizeStreaming(
      notes,
      options,
      () => controller.abort(),
      controller.signal,
    ),
    { name: 'AbortError' },
    'pass the signal to summarizeStreaming() and readText()',
  );
  assert.equal(
    created[1]?.destroyed,
    1,
    'destroy the summarizer in a finally block, so Stop releases it too',
  );
});

test('Step 3 · timedStreaming reports time to first text and total time', async (t) => {
  simulate(t, { chunkDelayMs: 5 });
  const options = streamOptions('long');
  let updates = 0;
  const timing = await step('Step 3 (timedStreaming)', () =>
    timedStreaming(notes, options, () => updates++),
  );
  assert.ok(updates > 1, 'forward every update to the onText callback');
  assert.equal(
    timing.text,
    await summarizeOnce(notes, options),
    'return the streamed text as `text`',
  );
  assert.ok(
    timing.firstTextMs > 0,
    'set firstTextMs when the first text arrives (performance.now() - start)',
  );
  assert.ok(
    timing.totalMs > timing.firstTextMs,
    'measure totalMs after the stream has finished',
  );
});
