import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAll, simulate, spy, step } from './harness';
import {
  cancelOnAbort,
  createSession,
  startStream,
  streamAnswer,
} from '../../apps/movie-theater/src/app/lab/exercises/2-2-streaming/exercise';

/** Give the event loop a moment, so pending stream callbacks can run. */
const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

/** Remember the stream that a session hands out, so a check can inspect it afterwards. */
function captureStreams(session: LanguageModel): ReadableStream<string>[] {
  const streams: ReadableStream<string>[] = [];
  const original = session.promptStreaming.bind(session);
  session.promptStreaming = (input, options) => {
    const stream = original(input, options);
    streams.push(stream);
    return stream;
  };
  return streams;
}

/**
 * A fake session whose stream sends one chunk and then waits forever. Only
 * reader.cancel() can end it, like a model that ignores the abort signal.
 */
function stuckSession() {
  const state = {
    cancelled: false,
    stream: undefined as ReadableStream<string> | undefined,
  };
  const session = {
    promptStreaming: () => {
      state.stream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('Hello ');
        },
        cancel() {
          state.cancelled = true;
        },
      });
      return state.stream;
    },
  } as unknown as LanguageModel;
  return { session, state };
}

/**
 * streamAnswer() uses Steps 1 and 2. Call them first, so an unfinished
 * earlier step is reported by its own name instead of as "Step 3".
 */
function requireEarlierSteps(session: LanguageModel) {
  void startStream(session, 'Warm-up', new AbortController().signal).cancel();
  cancelOnAbort(
    new ReadableStream<string>().getReader(),
    new AbortController().signal,
  )();
}

test('Step 1 · startStream calls promptStreaming() with the question and the signal', async (t) => {
  simulate(t);
  const session = await createSession();
  t.after(() => session.destroy());
  const calls = spy(t, session, 'promptStreaming');
  const controller = new AbortController();
  const stream = await step('Step 1 (startStream)', () =>
    startStream(session, 'Something atmospheric?', controller.signal),
  );
  assert.ok(
    stream instanceof ReadableStream,
    'return the ReadableStream from session.promptStreaming()',
  );
  assert.equal(calls.calls.length, 1, 'call session.promptStreaming() once');
  assert.equal(
    calls.calls[0][0],
    'Something atmospheric?',
    'pass the question as the first argument',
  );
  const options = calls.calls[0][1] as LanguageModelPromptOptions | undefined;
  assert.equal(
    options?.signal,
    controller.signal,
    'pass { signal } as the second argument, so Stop can cancel the model',
  );
  assert.ok(
    (await readAll(stream)).length > 0,
    'the stream should contain the answer',
  );
});

test('Step 2 · cancelOnAbort cancels the reader on abort, and its cleanup function stops listening', async () => {
  let reason: unknown = 'not cancelled';
  const reader = new ReadableStream<string>({
    cancel(why) {
      reason = why;
    },
  }).getReader();
  const controller = new AbortController();
  const stopListening = await step('Step 2 (cancelOnAbort)', () =>
    cancelOnAbort(reader, controller.signal),
  );
  assert.equal(
    typeof stopListening,
    'function',
    'return a function that removes the abort listener',
  );
  controller.abort();
  await tick();
  assert.equal(
    reason,
    controller.signal.reason,
    'on abort, call reader.cancel(signal.reason)',
  );

  // Now the cleanup: after stopListening(), an abort must not cancel anything.
  let cancelledLater = false;
  const second = new ReadableStream<string>({
    cancel() {
      cancelledLater = true;
    },
  }).getReader();
  const later = new AbortController();
  cancelOnAbort(second, later.signal)();
  later.abort();
  await tick();
  assert.equal(
    cancelledLater,
    false,
    'the returned function should call signal.removeEventListener(...)',
  );
});

test('Step 3 · streamAnswer reports growing text after every chunk and returns the whole answer', async (t) => {
  simulate(t);
  const session = await createSession();
  t.after(() => session.destroy());
  requireEarlierSteps(session);
  const streams = captureStreams(session);
  const seen: string[] = [];
  const answer = await step('Step 3 (streamAnswer)', () =>
    streamAnswer(
      session,
      'Something atmospheric?',
      (text) => seen.push(text),
      new AbortController().signal,
    ),
  );
  assert.ok(
    seen.length >= 3,
    `call onText after every chunk (it was called ${seen.length} times)`,
  );
  for (let i = 1; i < seen.length; i++)
    assert.ok(
      seen[i].length > seen[i - 1].length && seen[i].startsWith(seen[i - 1]),
      'pass the text SO FAR to onText: add each chunk to the previous text (text += value)',
    );
  assert.equal(typeof answer, 'string');
  assert.equal(
    answer,
    seen.at(-1),
    'return the whole answer: the same text as the last onText call',
  );
  assert.equal(
    streams.length,
    1,
    'use startStream() (session.promptStreaming) to get the stream',
  );
  assert.equal(
    streams[0].locked,
    false,
    'call reader.releaseLock() in a finally block',
  );
});

test('Step 3 · Stop: streamAnswer rejects with AbortError, cancels the reader and releases it', async () => {
  // First make sure Step 3 is implemented, so the failures below are real failures.
  requireEarlierSteps(stuckSession().session);
  const { session, state } = stuckSession();
  const controller = new AbortController();
  const seen: string[] = [];
  const result = step('Step 3 (streamAnswer)', () =>
    streamAnswer(
      session,
      'Tell me a long story',
      (text) => {
        seen.push(text);
        controller.abort(); // the viewer presses Stop after the first chunk
      },
      controller.signal,
    ),
  );
  const timeout = new Promise<'timeout'>((resolve) =>
    setTimeout(() => resolve('timeout'), 1000),
  );
  const outcome = await Promise.race([
    result.then(
      () => 'resolved',
      (error: unknown) => error,
    ),
    timeout,
  ]);
  if (outcome instanceof Error && outcome.message.startsWith('🧩'))
    throw outcome;
  assert.notEqual(
    outcome,
    'timeout',
    'streamAnswer kept waiting after Stop: call cancelOnAbort(reader, signal) so the reader is cancelled',
  );
  assert.ok(
    state.cancelled,
    'on abort the reader must be cancelled (cancelOnAbort)',
  );
  assert.ok(
    outcome instanceof Error && outcome.name === 'AbortError',
    'after Stop, reject with an AbortError: call signal.throwIfAborted() after each reader.read()',
  );
  await tick();
  assert.equal(seen.length, 1, 'do not call onText again after Stop');
  assert.equal(
    state.stream?.locked,
    false,
    'release the reader in finally, also when it was cancelled',
  );
});
