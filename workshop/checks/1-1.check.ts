import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, simulate, spy, step } from './harness';
import {
  type ArchitectureNeeds,
  chooseArchitecture,
  estimateCloudCost,
  measurePrompt,
} from '../../apps/movie-theater/src/app/lab/exercises/1-1-cloud-vs-local/exercise';

const near = (actual: number, expected: number, message: string) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message} (expected ${expected}, got ${actual})`,
  );

const base: ArchitectureNeeds = {
  localAvailability: 'available',
  dataIsSensitive: false,
  mustWorkOffline: false,
  needsLargeModel: false,
};

test('Step 1 · measurePrompt counts input and output tokens with measureContextUsage()', async (t) => {
  simulate(t);
  const session = await LanguageModel.create();
  t.after(() => session.destroy());
  const measure = spy(t, session, 'measureContextUsage');
  const text = 'What makes an animated short film memorable?';
  const result = await step('Step 1 (measurePrompt)', () =>
    measurePrompt(session, text),
  );
  assert.equal(
    measure.calls[0]?.[0],
    text,
    'call session.measureContextUsage(text) first, before prompt()',
  );
  assert.equal(
    result.inputTokens,
    estimateTokens(text),
    'inputTokens should be the result of measureContextUsage(text)',
  );
  assert.equal(
    typeof result.answer,
    'string',
    'return the answer of session.prompt(text)',
  );
  assert.ok(
    result.answer.length > 0,
    'return the answer of session.prompt(text)',
  );
  assert.ok(
    measure.calls.some((call) => call[0] === result.answer),
    'measure the answer with measureContextUsage(answer) to approximate the output tokens',
  );
  assert.equal(
    result.outputTokens,
    estimateTokens(result.answer),
    'outputTokens should be measureContextUsage(answer)',
  );
});

test('Step 1 · measurePrompt times session.prompt() with performance.now()', async (t) => {
  simulate(t, { latencyMs: 60 });
  const session = await LanguageModel.create();
  t.after(() => session.destroy());
  const result = await step('Step 1 (measurePrompt)', () =>
    measurePrompt(session, 'Say hi.'),
  );
  assert.equal(
    typeof result.latencyMs,
    'number',
    'latencyMs should be a number of milliseconds',
  );
  assert.ok(
    result.latencyMs >= 50 && result.latencyMs < 2000,
    `the simulated model answers after ~60 ms; latencyMs was ${result.latencyMs}. Read performance.now() just before and just after await session.prompt()`,
  );
});

test('Step 2 · estimateCloudCost prices input and output tokens per million', async () => {
  const usage = { inputTokens: 1000, outputTokens: 500 };
  const prices = { inputPerMillion: 2, outputPerMillion: 8 };
  const cost = await step('Step 2 (estimateCloudCost)', () =>
    estimateCloudCost(usage, prices, 10_000),
  );
  near(
    cost.perRequest,
    0.006,
    'perRequest = (1000 × $2 + 500 × $8) / 1,000,000',
  );
  near(cost.perMonth, 60, 'perMonth = perRequest × requestsPerMonth');
  const outputOnly = estimateCloudCost(
    { inputTokens: 0, outputTokens: 1_000_000 },
    prices,
    1,
  );
  near(outputOnly.perRequest, 8, 'use outputPerMillion for the output tokens');
  near(
    estimateCloudCost(usage, prices, 0).perMonth,
    0,
    'zero requests per month cost nothing',
  );
});

test('Step 3 · chooseArchitecture keeps work local when the device can run it', async () => {
  const plain = await step('Step 3 (chooseArchitecture)', () =>
    chooseArchitecture(base),
  );
  assert.equal(
    plain.architecture,
    'local',
    'an available model with no special needs → local',
  );
  assert.ok(
    plain.reason.length > 0,
    'always return a reason the user can read',
  );
  assert.equal(
    chooseArchitecture({
      ...base,
      localAvailability: 'downloadable',
      dataIsSensitive: true,
      mustWorkOffline: true,
    }).architecture,
    'local',
    "a 'downloadable' model can still run on the device → local (Rule 4)",
  );
});

test('Step 3 · chooseArchitecture uses the cloud when there is no local model', async () => {
  await step('Step 3 (chooseArchitecture)', () => chooseArchitecture(base));
  for (const localAvailability of ['missing', 'unavailable'] as const)
    assert.equal(
      chooseArchitecture({ ...base, localAvailability }).architecture,
      'cloud',
      `localAvailability '${localAvailability}' → cloud (Rule 1)`,
    );
  const offline = chooseArchitecture({
    ...base,
    localAvailability: 'unavailable',
    mustWorkOffline: true,
  });
  assert.equal(
    offline.architecture,
    'cloud',
    'no local model → cloud, even when offline is required (Rule 1)',
  );
  assert.match(
    offline.reason,
    /offline|fallback/i,
    'when offline is required, say in the reason that the AI part cannot work offline',
  );
});

test('Step 3 · chooseArchitecture splits large-model work into hybrid when data is private or offline', async () => {
  await step('Step 3 (chooseArchitecture)', () => chooseArchitecture(base));
  assert.equal(
    chooseArchitecture({ ...base, needsLargeModel: true }).architecture,
    'cloud',
    'large model + nothing private + online → cloud (Rule 2)',
  );
  assert.equal(
    chooseArchitecture({
      ...base,
      needsLargeModel: true,
      dataIsSensitive: true,
    }).architecture,
    'hybrid',
    'large model + private data → hybrid (Rule 3)',
  );
  assert.equal(
    chooseArchitecture({
      ...base,
      needsLargeModel: true,
      mustWorkOffline: true,
    }).architecture,
    'hybrid',
    'large model + offline use → hybrid (Rule 3)',
  );
});
