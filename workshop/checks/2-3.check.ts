import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movies, simulate, spy, step } from './harness';
import {
  askForJson,
  createSession,
  parseRecommendation,
  recommendationSchema,
} from '../../apps/movie-theater/src/app/lab/exercises/2-3-structured-output/exercise';

const ids = movies.map((movie) => movie.id);

test('Step 1 · the schema allows only real movie IDs and exactly two required fields', async () => {
  const schema = await step('Step 1 (recommendationSchema)', () =>
    recommendationSchema(),
  );
  assert.equal(
    schema['type'],
    'object',
    'the schema describes an object: type "object"',
  );
  const properties = schema['properties'] as
    | Record<string, Record<string, unknown>>
    | undefined;
  assert.ok(
    properties?.['movieId'] && properties['reason'],
    'add properties.movieId and properties.reason',
  );
  assert.deepEqual(
    properties['movieId']['enum'],
    ids,
    'movieId needs enum: movies.map((movie) => movie.id), so only real IDs are possible',
  );
  assert.equal(
    properties['reason']['type'],
    'string',
    'reason should be { type: "string" }',
  );
  assert.deepEqual(
    [...((schema['required'] as string[] | undefined) ?? [])].sort(),
    ['movieId', 'reason'],
    'list both fields in required',
  );
  assert.equal(
    schema['additionalProperties'],
    false,
    'set additionalProperties: false, so no extra fields appear',
  );
});

test('Step 2 · askForJson passes the schema as responseConstraint and returns JSON text', async (t) => {
  simulate(t);
  recommendationSchema(); // Step 2 uses Step 1: an unfinished Step 1 is reported by its own name.
  const session = await createSession();
  t.after(() => session.destroy());
  const prompt = spy(t, session, 'prompt');
  const controller = new AbortController();
  const text = await step('Step 2 (askForJson)', () =>
    askForJson(
      session,
      'A family film about a rabbit, please',
      controller.signal,
    ),
  );
  assert.equal(prompt.calls.length, 1, 'call session.prompt() once');
  assert.equal(
    prompt.calls[0][0],
    'A family film about a rabbit, please',
    'pass the request as the first argument',
  );
  const options = prompt.calls[0][1] as LanguageModelPromptOptions | undefined;
  assert.deepEqual(
    options?.responseConstraint,
    recommendationSchema(),
    'pass { responseConstraint: recommendationSchema() } as the second argument',
  );
  assert.equal(
    options?.signal,
    controller.signal,
    'pass the signal too, so the request can be cancelled',
  );
  assert.equal(
    typeof text,
    'string',
    'return the text from session.prompt() (do not parse it here)',
  );
  const value = JSON.parse(text) as { movieId?: string };
  assert.ok(
    ids.includes(String(value.movieId)),
    'the constrained answer should contain a real movieId',
  );
});

test('Step 3 · parseRecommendation accepts a valid answer', async () => {
  const recommendation = await step('Step 3 (parseRecommendation)', () =>
    parseRecommendation('{"movieId":"bunny","reason":"Funny and short."}'),
  );
  assert.deepEqual(
    recommendation,
    { movieId: 'bunny', reason: 'Funny and short.' },
    'return the result of validateRecommendation(JSON.parse(text))',
  );
});

test('Step 3 · parseRecommendation rejects broken JSON and data that is not in the catalogue', async () => {
  // First make sure Step 3 is implemented, so the failures below are real failures.
  await step('Step 3 (parseRecommendation)', () =>
    parseRecommendation('{"movieId":"sintel","reason":"A fantasy quest."}'),
  );
  const bad: [string, string][] = [
    ['Sure! I recommend Sintel.', 'text that is not JSON'],
    ['{"movieId":"sintel","reason":"Dragons"', 'cut-off JSON'],
    [
      '{"movieId":"titanic","reason":"A classic."}',
      'valid JSON with an unknown movieId',
    ],
    ['{"movieId":"sintel"}', 'a missing reason'],
    ['{"movieId":"sintel","reason":"   "}', 'an empty reason'],
    ['["sintel"]', 'an array instead of an object'],
  ];
  for (const [text, what] of bad)
    assert.throws(
      () => parseRecommendation(text),
      Error,
      `parseRecommendation must throw for ${what}: ${text}. Call validateRecommendation() after JSON.parse().`,
    );
  assert.throws(
    () => parseRecommendation('Sure! I recommend Sintel.'),
    (error: Error) =>
      !(error instanceof SyntaxError) && error.message.length > 0,
    'catch the SyntaxError from JSON.parse() and throw a clear Error of your own instead',
  );
  const trimmed = parseRecommendation(
    '{"movieId":"dream","reason":"Calm.","rating":11}',
  );
  assert.deepEqual(
    Object.keys(trimmed).sort(),
    ['movieId', 'reason'],
    'return only movieId and reason',
  );
});
