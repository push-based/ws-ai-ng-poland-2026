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
  checkImageSupport,
  defaultQuestion,
  describeImage,
  imageMessage,
  imageSessionOptions,
} from '../../apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise';

/** In Node there is no canvas. Any object stands in for the picture: the simulation only looks at the part type. */
const picture = { width: 64, height: 36 } as unknown as ImageBitmapSource;

interface Recorded {
  options: LanguageModelCreateOptions | undefined;
  prompts: unknown[][];
  destroyed: boolean;
  /** true when destroy() ran while a prompt() was still waiting for its answer. */
  destroyedTooEarly: boolean;
}

/** Record every session that LanguageModel.create() returns: its options, prompt() calls and destroy(). */
function recordSessions(t: TestContext, failPrompt = false): Recorded[] {
  const sessions: Recorded[] = [];
  // Keep a reference: the simulation removes the LanguageModel global after the test.
  const model = LanguageModel;
  const original = model.create;
  model.create = async function (options?: LanguageModelCreateOptions) {
    const session = await original.call(model, options);
    const record: Recorded = {
      options,
      prompts: [],
      destroyed: false,
      destroyedTooEarly: false,
    };
    sessions.push(record);
    const prompt = session.prompt.bind(session);
    const destroy = session.destroy.bind(session);
    let pending = 0;
    session.prompt = (...args: Parameters<LanguageModel['prompt']>) => {
      record.prompts.push(args);
      const answer = failPrompt
        ? Promise.reject(new Error('The model failed (test).'))
        : prompt(...args);
      pending++;
      const settled = () => void pending--;
      answer.then(settled, settled);
      return answer;
    };
    session.destroy = () => {
      record.destroyed = true;
      if (pending > 0) record.destroyedTooEarly = true;
      return destroy();
    };
    return session;
  };
  t.after(() => {
    model.create = original;
  });
  return sessions;
}

/**
 * describeImage() uses Steps 1–3. Call them first, so an unfinished earlier
 * step is reported by its own name instead of as "Step 4".
 */
async function requireEarlierSteps() {
  imageSessionOptions();
  imageMessage(picture, defaultQuestion);
  await checkImageSupport();
}

test('Step 1 · imageSessionOptions declares text + image input and text output', async () => {
  const options = await step('Step 1 (imageSessionOptions)', () =>
    imageSessionOptions(),
  );
  const inputs = options.expectedInputs ?? [];
  assert.ok(
    inputs.some(
      (input) => input.type === 'text' && input.languages?.includes('en'),
    ),
    "expectedInputs needs { type: 'text', languages: ['en'] }",
  );
  assert.ok(
    inputs.some((input) => input.type === 'image'),
    "expectedInputs needs { type: 'image' }: without it the session may not accept pictures",
  );
  assert.ok(
    (options.expectedOutputs ?? []).some(
      (output) => output.type === 'text' && output.languages?.includes('en'),
    ),
    "expectedOutputs needs { type: 'text', languages: ['en'] }",
  );
});

test('Step 2 · checkImageSupport asks availability() about IMAGE input', async (t) => {
  simulate(t);
  const availability = spy(t, LanguageModel, 'availability');
  const state = await step('Step 2 (checkImageSupport)', () =>
    checkImageSupport(),
  );
  assert.equal(
    state,
    'available',
    'return what LanguageModel.availability() says',
  );
  assert.deepEqual(
    availability.calls[0]?.[0],
    imageSessionOptions(),
    'pass imageSessionOptions() to availability()',
  );
  configureSimulation({ availability: 'unavailable' });
  assert.equal(
    await checkImageSupport(),
    'unavailable',
    'return "unavailable" when the device cannot do it',
  );
  const missing = await withoutGlobal('LanguageModel', () =>
    checkImageSupport(),
  );
  assert.equal(
    missing,
    'missing',
    'check `typeof LanguageModel` first and return "missing" when the API does not exist',
  );
});

test('Step 3 · imageMessage = one user message with a text part and an image part', async () => {
  const messages = await step('Step 3 (imageMessage)', () =>
    imageMessage(picture, defaultQuestion),
  );
  assert.ok(
    Array.isArray(messages) && messages.length === 1,
    'return an array with exactly one message',
  );
  assert.equal(messages[0].role, 'user', 'the message role is "user"');
  const content = messages[0].content;
  assert.ok(
    Array.isArray(content),
    'content must be an array of parts, not a string',
  );
  assert.deepEqual(
    content[0],
    { type: 'text', value: defaultQuestion },
    "first part: { type: 'text', value: question }",
  );
  assert.equal(
    content[1]?.type,
    'image',
    "second part: { type: 'image', value: image }",
  );
  assert.equal(
    content[1]?.value,
    picture,
    'pass the image object itself as the value (no file name, no data URL)',
  );
});

test('Step 4 · describeImage creates an image session, sends the parts and destroys it', async (t) => {
  simulate(t);
  await requireEarlierSteps();
  const sessions = recordSessions(t);
  const controller = new AbortController();
  const answer = await step('Step 4 (describeImage)', () =>
    describeImage(picture, defaultQuestion, controller.signal),
  );
  assert.equal(
    sessions.length,
    1,
    'create exactly one session with LanguageModel.create()',
  );
  const [session] = sessions;
  assert.deepEqual(
    session.options?.expectedInputs,
    imageSessionOptions().expectedInputs,
    'create the session with ...imageSessionOptions()',
  );
  assert.deepEqual(
    session.prompts[0]?.[0],
    imageMessage(picture, defaultQuestion),
    'prompt with imageMessage(image, question)',
  );
  assert.equal(
    (session.prompts[0]?.[1] as LanguageModelPromptOptions | undefined)?.signal,
    controller.signal,
    'pass { signal } to prompt(), so the page can stop it',
  );
  assert.match(answer, /description/i, 'return the text from session.prompt()');
  assert.ok(
    session.destroyed,
    'destroy the one-shot session when the answer is ready',
  );
  assert.equal(
    session.destroyedTooEarly,
    false,
    'write `return await session.prompt(...)` inside try: without await, finally destroys the session before the answer arrives',
  );
});

test('Step 4 · describeImage destroys the session after an error and refuses when images are unavailable', async (t) => {
  simulate(t);
  await requireEarlierSteps();
  // First make sure Step 4 is implemented, so the failures below are real failures.
  await step('Step 4 (describeImage)', () =>
    describeImage(picture, defaultQuestion),
  );
  const failing = recordSessions(t, true);
  await assert.rejects(
    describeImage(picture, defaultQuestion),
    /model failed/,
    'let errors from prompt() reach the caller',
  );
  assert.ok(
    failing[0]?.destroyed,
    'destroy the session in a finally block, so it is released even when prompt() fails (use return await inside try)',
  );
  configureSimulation({ availability: 'unavailable' });
  await assert.rejects(
    describeImage(picture, defaultQuestion),
    Error,
    'throw an Error when checkImageSupport() is "unavailable"',
  );
  assert.equal(
    failing.length,
    1,
    'do not create a session when image input is unavailable',
  );
});
