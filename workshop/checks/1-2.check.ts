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
  checkAll,
  checkApi,
  isExposed,
  promptChecks,
  taskChecks,
  textPromptOptions,
  translatorCheck,
} from '../../apps/movie-theater/src/app/lab/exercises/1-2-feature-detection/exercise';

/** Replace a static method for one test; restore it afterwards. */
function replace(t: TestContext, target: object, key: string, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value,
  });
  t.after(() => {
    if (original) Object.defineProperty(target, key, original);
  });
}

test('Step 1 · isExposed detects globals without throwing', async (t) => {
  simulate(t);
  const exposed = await step('Step 1 (isExposed)', () =>
    isExposed('LanguageModel'),
  );
  assert.equal(
    exposed,
    true,
    'LanguageModel is installed by the simulation, so isExposed should return true',
  );
  assert.equal(
    isExposed('NoSuchAiApi'),
    false,
    'a name that does not exist → false (and no ReferenceError)',
  );
  await withoutGlobal('Summarizer', () =>
    assert.equal(
      isExposed('Summarizer'),
      false,
      'look the name up on globalThis at call time, do not cache it',
    ),
  );
});

test('Step 2 · checkApi returns the availability() answer for an exposed API', async (t) => {
  simulate(t);
  const row = await step('Step 2 (checkApi)', () =>
    checkApi('LanguageModel', 'English text', () =>
      Promise.resolve('downloadable'),
    ),
  );
  assert.deepEqual(
    row,
    { api: 'LanguageModel', detail: 'English text', status: 'downloadable' },
    'return { api, detail, status } with status = the result of await check()',
  );
});

test("Step 2 · checkApi reports 'missing' and 'error' instead of throwing", async (t) => {
  simulate(t);
  await step('Step 2 (checkApi)', () =>
    checkApi('LanguageModel', 'x', () => Promise.resolve('available')),
  );
  let called = false;
  const missing = await withoutGlobal('Writer', () =>
    checkApi('Writer', 'English', async () => {
      called = true;
      return 'available';
    }),
  );
  assert.equal(
    missing.status,
    'missing',
    "an API that is not exposed → status 'missing'",
  );
  assert.equal(
    called,
    false,
    'do not call check() when the API is missing: check isExposed(api) first',
  );
  const failed = await checkApi('Summarizer', 'English', () =>
    Promise.reject(new Error('Boom from the check')),
  );
  assert.equal(
    failed.status,
    'error',
    "a check that throws → status 'error' (catch it, do not let it reject)",
  );
  assert.equal(
    failed.detail,
    'Boom from the check',
    "put the error's message in detail",
  );
});

test('Step 3 · promptChecks asks LanguageModel about text, and separately about text + image', async (t) => {
  simulate(t);
  const checks = await step('Step 3 (promptChecks)', () => promptChecks());
  assert.equal(
    checks.length,
    2,
    'return two checks: text only, and text + image',
  );
  assert.ok(
    checks.every((c) => c.api === 'LanguageModel'),
    "both checks are for api 'LanguageModel'",
  );
  assert.notEqual(
    checks[0].detail,
    checks[1].detail,
    'give each check its own detail text so the rows can be told apart',
  );
  const availability = spy(t, LanguageModel, 'availability');
  for (const c of checks) await c.check();
  assert.deepEqual(
    availability.calls[0]?.[0],
    textPromptOptions,
    'the first check passes textPromptOptions',
  );
  const image = availability.calls[1]?.[0] as
    | LanguageModelCreateCoreOptions
    | undefined;
  const inputs = [...(image?.expectedInputs ?? [])];
  assert.ok(
    inputs.some((input) => input.type === 'image'),
    "the second check adds { type: 'image' } to expectedInputs",
  );
  assert.ok(
    inputs.some((input) => input.type === 'text'),
    'the second check still declares the text input too',
  );
});

test('Step 4 · translatorCheck checks exactly the chosen language pair', async (t) => {
  simulate(t);
  const check = await step('Step 4 (translatorCheck)', () =>
    translatorCheck('en', 'pl'),
  );
  assert.equal(check.api, 'Translator', "api should be 'Translator'");
  assert.ok(
    check.detail.includes('en') && check.detail.includes('pl'),
    'show the pair (en, pl) in detail',
  );
  const availability = spy(t, Translator, 'availability');
  assert.equal(await check.check(), 'available');
  assert.deepEqual(
    availability.calls[0]?.[0],
    { sourceLanguage: 'en', targetLanguage: 'pl' },
    'call Translator.availability({ sourceLanguage, targetLanguage })',
  );
  assert.equal(
    await translatorCheck('en', 'xx').check(),
    'unavailable',
    'an unsupported pair is unavailable',
  );
});

test('Step 5 · checkAll returns one row per check, in order', async (t) => {
  simulate(t);
  const rows = await step('Step 5 (checkAll)', () => checkAll('en', 'de'));
  assert.equal(
    rows.length,
    3 + taskChecks.length,
    'two Prompt rows + one Translator row + one row per taskChecks item',
  );
  assert.deepEqual(
    rows.map((row) => row.api),
    [
      'LanguageModel',
      'LanguageModel',
      'Translator',
      ...taskChecks.map((c) => c.api),
    ],
    'order: ...promptChecks(), translatorCheck(source, target), ...taskChecks',
  );
  assert.ok(
    rows[2].detail.includes('de'),
    'pass the chosen target language to translatorCheck()',
  );
  configureSimulation({ availability: 'unavailable' });
  assert.ok(
    (await checkAll('en', 'pl')).every((row) => row.status === 'unavailable'),
    'statuses come from availability()',
  );
});

test('Step 5 · checkAll runs the checks in parallel and one failure hides nothing', async (t) => {
  simulate(t);
  await step('Step 5 (checkAll)', () => checkAll('en', 'pl'));
  const events: string[] = [];
  const slow = (name: string) => async () => {
    events.push(`start ${name}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
    events.push(`end ${name}`);
    return 'available' as Availability;
  };
  replace(t, LanguageModel, 'availability', slow('LanguageModel'));
  replace(t, Translator, 'availability', slow('Translator'));
  replace(t, Summarizer, 'availability', () =>
    Promise.reject(new Error('Summarizer check failed')),
  );
  const rows = await withoutGlobal('Proofreader', () => checkAll('en', 'pl'));
  const firstEnd = events.findIndex((event) => event.startsWith('end'));
  assert.ok(
    events.slice(firstEnd).every((event) => event.startsWith('end')),
    'start every check before awaiting any of them: use Promise.all(checks.map(...)), not await in a loop',
  );
  assert.equal(
    rows.find((row) => row.api === 'Summarizer')?.status,
    'error',
    'a throwing check becomes an error row',
  );
  assert.equal(
    rows.find((row) => row.api === 'Proofreader')?.status,
    'missing',
    'a hidden API becomes a missing row',
  );
  assert.equal(
    rows.find((row) => row.api === 'Translator')?.status,
    'available',
    'the other checks still report',
  );
});
