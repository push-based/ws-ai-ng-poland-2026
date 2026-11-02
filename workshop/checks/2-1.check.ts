import { test } from 'node:test';
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
  ask,
  closeConcierge,
  conciergeOptions,
  createConcierge,
  initialPrompts,
  systemPrompt,
} from '../../apps/movie-theater/src/app/lab/exercises/2-1-sessions/exercise';

test('Step 1 · the system prompt grounds the model in the real catalogue', async () => {
  const prompt = await step('Step 1 (systemPrompt)', () => systemPrompt());
  assert.equal(typeof prompt, 'string');
  for (const movie of movies)
    assert.ok(
      prompt.includes(movie.id),
      `the system prompt should contain the id "${movie.id}"`,
    );
  assert.ok(
    prompt.length < 4000,
    'keep the system prompt small: it uses context on every request',
  );
});

test('Step 2 · initialPrompts = system message + a user/assistant example', async () => {
  const prompts = await step('Step 2 (initialPrompts)', () => initialPrompts());
  assert.ok(
    Array.isArray(prompts) && prompts.length >= 3,
    'return at least three messages',
  );
  assert.equal(
    prompts[0].role,
    'system',
    'the first message must have role "system"',
  );
  assert.equal(
    prompts[0].content,
    systemPrompt(),
    'the system message should use systemPrompt()',
  );
  assert.ok(
    prompts.some((m) => m.role === 'user'),
    'add an example message with role "user"',
  );
  assert.ok(
    prompts.some((m) => m.role === 'assistant'),
    'add an example answer with role "assistant"',
  );
});

test('Step 3 · createConcierge checks availability with the same options and creates a grounded session', async (t) => {
  simulate(t);
  const availability = spy(t, LanguageModel, 'availability');
  const create = spy(t, LanguageModel, 'create');
  const session = await step('Step 3 (createConcierge)', () =>
    createConcierge(),
  );
  t.after(() => session.destroy());
  assert.equal(
    availability.calls.length,
    1,
    'call LanguageModel.availability() once before create()',
  );
  assert.deepEqual(
    availability.calls[0][0],
    conciergeOptions,
    'pass conciergeOptions to availability()',
  );
  const options = create.calls[0]?.[0] as LanguageModelCreateOptions;
  assert.ok(options, 'call LanguageModel.create()');
  assert.deepEqual(
    options.expectedInputs,
    conciergeOptions.expectedInputs,
    'create() needs the same expectedInputs',
  );
  assert.ok(options.initialPrompts?.length, 'pass initialPrompts to create()');
  assert.ok(
    session.contextUsage > 0,
    'the new session should already contain the initial prompts',
  );
});

test('Step 3 · createConcierge reports a clear error when the API is missing or unavailable', async (t) => {
  simulate(t);
  // First make sure Step 3 is implemented, so the failures below are real failures.
  (await step('Step 3 (createConcierge)', () => createConcierge())).destroy();
  configureSimulation({ availability: 'unavailable' });
  await assert.rejects(
    createConcierge(),
    Error,
    'throw an Error when availability() is "unavailable"',
  );
  await withoutGlobal('LanguageModel', () =>
    assert.rejects(
      createConcierge(),
      (error: Error) => !(error instanceof ReferenceError),
      'check `typeof LanguageModel` first, so a missing API gives a readable Error, not a ReferenceError',
    ),
  );
});

test('Step 4 · ask() reuses the session, so follow-ups see earlier turns', async (t) => {
  simulate(t);
  const session = await createConcierge();
  t.after(() => session.destroy());
  const before = session.contextUsage;
  const first = await step('Step 4 (ask)', () =>
    ask(session, 'Something atmospheric?'),
  );
  assert.equal(typeof first, 'string');
  assert.ok(first.length > 0, 'return the model answer');
  assert.ok(
    session.contextUsage > before,
    'prompt() in the same session should add to its context',
  );
  const second = await ask(session, 'And for kids?');
  assert.match(
    second,
    /Earlier you asked/,
    'the simulated model remembers the earlier question only in the same session',
  );
});

test('Step 5 · closeConcierge destroys the session and accepts undefined', async (t) => {
  simulate(t);
  const session = await createConcierge();
  await step('Step 5 (closeConcierge)', () => closeConcierge(session));
  await assert.rejects(
    session.prompt('Still there?'),
    /destroyed/,
    'the session should be destroyed',
  );
  assert.doesNotThrow(
    () => closeConcierge(undefined),
    'closeConcierge(undefined) must not throw',
  );
});
