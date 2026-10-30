import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureSimulation, simulate, spy, step } from './harness';
import {
  compact,
  contextStats,
  createSession,
  fork,
  measureMessage,
  summaryInstruction,
  systemPrompt,
  watchOverflow,
} from '../../apps/movie-theater/src/app/lab/exercises/2-4-context-window/exercise';

test('Step 1 · contextStats reports used tokens, the window and a percentage', async (t) => {
  simulate(t);
  const session = await createSession();
  t.after(() => session.destroy());
  await session.prompt('Something atmospheric for tonight?');
  const stats = await step('Step 1 (contextStats)', () =>
    contextStats(session),
  );
  assert.equal(
    stats.used,
    session.contextUsage,
    'used should be session.contextUsage',
  );
  assert.equal(
    stats.window,
    session.contextWindow,
    'window should be session.contextWindow',
  );
  assert.equal(
    stats.percent,
    Math.round((session.contextUsage / session.contextWindow) * 100),
    'percent = Math.round((used / window) * 100)',
  );
  const empty = contextStats({
    contextUsage: 0,
    contextWindow: 0,
  } as LanguageModel);
  assert.equal(
    empty.percent,
    0,
    'return percent 0 when the window is 0 (no division by zero)',
  );
});

test('Step 2 · measureMessage measures without sending and compares with the free space', async (t) => {
  simulate(t);
  const session = await createSession();
  t.after(() => session.destroy());
  const measure = spy(t, session, 'measureContextUsage');
  const before = session.contextUsage;
  const small = await step('Step 2 (measureMessage)', () =>
    measureMessage(session, 'x'.repeat(400)),
  );
  assert.equal(
    measure.calls.length,
    1,
    'call session.measureContextUsage(text) once',
  );
  assert.equal(
    small.needed,
    100,
    'needed is the number returned by measureContextUsage()',
  );
  assert.equal(
    small.remaining,
    session.contextWindow - session.contextUsage,
    'remaining = contextWindow - contextUsage',
  );
  assert.equal(small.fits, true, 'a small message fits');
  assert.equal(
    session.contextUsage,
    before,
    'measuring must not send the message (do not call prompt())',
  );
  const huge = await measureMessage(
    session,
    'x'.repeat(session.contextWindow * 4 + 400),
  );
  assert.equal(huge.fits, false, 'fits must be false when needed > remaining');
});

test('Step 3 · watchOverflow calls back on contextoverflow and can stop listening', async (t) => {
  simulate(t, { contextWindow: 600 });
  const session = await createSession();
  t.after(() => session.destroy());
  let overflows = 0;
  const stop = await step('Step 3 (watchOverflow)', () =>
    watchOverflow(session, () => overflows++),
  );
  assert.equal(
    typeof stop,
    'function',
    'return a function that removes the listener',
  );
  await session.prompt('x'.repeat(1200));
  await session.prompt('y'.repeat(1200)); // 600-token simulated window: old turns are evicted
  assert.ok(
    overflows >= 1,
    'listen with session.addEventListener("contextoverflow", onOverflow)',
  );
  const seen = overflows;
  stop();
  await session.prompt('z'.repeat(1200));
  assert.equal(
    overflows,
    seen,
    'the returned function should call session.removeEventListener(...)',
  );
});

test('Step 4 · fork returns an independent copy made with clone()', async (t) => {
  simulate(t);
  const session = await createSession();
  t.after(() => session.destroy());
  await session.prompt('Something atmospheric for tonight?');
  const clone = spy(t, session, 'clone');
  const controller = new AbortController();
  const branch = await step('Step 4 (fork)', () =>
    fork(session, controller.signal),
  );
  t.after(() => branch.destroy());
  assert.equal(clone.calls.length, 1, 'call session.clone()');
  assert.equal(
    (clone.calls[0][0] as LanguageModelCloneOptions | undefined)?.signal,
    controller.signal,
    'pass { signal } to clone()',
  );
  assert.notEqual(
    branch,
    session,
    'return the new session from clone(), not the original',
  );
  assert.equal(
    branch.contextUsage,
    session.contextUsage,
    'the fork starts with the same context',
  );
  const original = session.contextUsage;
  await branch.prompt('Only the fork hears this question.');
  assert.equal(
    session.contextUsage,
    original,
    'a question in the fork must not change the original',
  );
  assert.ok(branch.contextUsage > original, 'the fork grows on its own');
});

test('Step 5 · compact summarises, starts a smaller session with the summary and destroys the old one', async (t) => {
  simulate(t);
  const session = await createSession();
  for (const question of [
    'Something atmospheric?',
    'Is it good for kids?',
    'What about a comedy?',
  ])
    await session.prompt(question);
  const before = session.contextUsage;
  const prompt = spy(t, session, 'prompt');
  const create = spy(t, LanguageModel, 'create');
  const result = await step('Step 5 (compact)', () => compact(session));
  t.after(() => result.session.destroy());
  assert.equal(
    prompt.calls[0]?.[0],
    summaryInstruction,
    'ask the OLD session for a summary with summaryInstruction',
  );
  assert.ok(
    typeof result.summary === 'string' && result.summary.length > 0,
    'return the summary text',
  );
  assert.equal(
    create.calls.length,
    1,
    'create one new session (use createSession)',
  );
  const prompts =
    (create.calls[0][0] as LanguageModelCreateOptions).initialPrompts ?? [];
  assert.equal(
    prompts[0]?.content,
    systemPrompt,
    'the new session starts with the same system prompt',
  );
  assert.ok(
    prompts.some((message) => String(message.content).includes(result.summary)),
    'seed the new session with the summary: createSession([{ role: "user", content: `…${summary}` }])',
  );
  assert.notEqual(result.session, session, 'return the NEW session');
  assert.ok(
    result.session.contextUsage < before,
    'the compacted session should use fewer tokens than before',
  );
  await assert.rejects(
    session.prompt('Still there?'),
    /destroyed/,
    'destroy the old session at the end',
  );
});

test('Step 5 · compact keeps the old session when the new one cannot be created', async (t) => {
  simulate(t);
  // First make sure Step 5 is implemented, so the failure below is a real failure.
  const first = await createSession();
  await first.prompt('Something atmospheric?');
  (await step('Step 5 (compact)', () => compact(first))).session.destroy();

  const session = await createSession();
  t.after(() => session.destroy());
  await session.prompt('Something atmospheric?');
  configureSimulation({ availability: 'unavailable' });
  await assert.rejects(
    compact(session),
    Error,
    'compact() should fail when the new session cannot be created',
  );
  await assert.doesNotReject(
    session.prompt('Still there?'),
    'create the new session BEFORE destroying the old one, so a failure keeps the conversation usable',
  );
});
