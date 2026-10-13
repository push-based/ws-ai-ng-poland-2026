import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeEvaluation, EvaluationState } from './evaluation.model.js';

const initial: EvaluationState = {
  movieId: 'sintel',
  position: 0,
  audioMix: { bass: 0, mid: 0, treble: 0, volume: 0.7 },
};

test('evaluation grades actual outcomes and tool order, not an agent success claim', () => {
  assert.equal(
    gradeEvaluation(
      'read',
      [{ name: 'get_screening_state', args: {} }],
      initial,
      initial,
    ),
    true,
  );
  assert.equal(gradeEvaluation('read', [], initial, initial), false);
  const mix = {
    ...initial,
    audioMix: { bass: -5, mid: 4, treble: 2, volume: 0.65 },
  };
  assert.equal(
    gradeEvaluation(
      'mix',
      [{ name: 'set_audio_mix', args: mix.audioMix }],
      initial,
      mix,
    ),
    true,
  );
  assert.equal(
    gradeEvaluation(
      'mix',
      [{ name: 'set_audio_mix', args: mix.audioMix }],
      initial,
      initial,
    ),
    false,
  );
  const journey = {
    ...initial,
    movieId: 'bunny',
    audioMix: { bass: 0, mid: 0, treble: 0, volume: 0.3 },
  };
  const calls = [
    { name: 'select_movie', args: { movieId: 'bunny' } },
    { name: 'set_audio_mix', args: journey.audioMix },
  ];
  assert.equal(gradeEvaluation('journey', calls, initial, journey), true);
  assert.equal(
    gradeEvaluation('journey', calls.toReversed(), initial, journey),
    false,
  );
});

test('negative evaluations require unchanged state and reject unrelated errors or actions', () => {
  assert.equal(gradeEvaluation('question', [], initial, initial), true);
  assert.equal(
    gradeEvaluation(
      'question',
      [{ name: 'set_audio_mix', args: initial.audioMix }],
      initial,
      initial,
    ),
    false,
  );
  assert.equal(
    gradeEvaluation(
      'invalid',
      [{ name: 'set_audio_mix', args: { bass: 99 }, error: 'outside range' }],
      initial,
      initial,
    ),
    true,
  );
  assert.equal(
    gradeEvaluation(
      'invalid',
      [{ name: 'seek_to', args: { seconds: 99 }, error: 'outside range' }],
      initial,
      initial,
    ),
    false,
  );
  assert.equal(
    gradeEvaluation('invalid', [], initial, { ...initial, position: 6 }),
    false,
  );
});

test('agent contract keeps arguments typed and accepts an empty object for read-only calls', async () => {
  const { decisionSchema, parseDecision } = await import(
    './evaluation.agent.js'
  );
  const tools = [
    {
      name: 'get_screening_state',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'seek_to',
      inputSchema: {
        type: 'object',
        properties: { seconds: { type: 'number' } },
      },
    },
  ];
  assert.deepEqual(
    decisionSchema(tools).properties.arguments.properties['seconds'],
    { type: 'number' },
  );
  assert.deepEqual(
    parseDecision(
      { tool: 'get_screening_state', arguments: {}, answer: '' },
      tools,
    ).args,
    {},
  );
  assert.throws(
    () =>
      parseDecision(
        { tool: 'get_screening_state', arguments: '', answer: '' },
        tools,
      ),
    /malformed/,
  );
  assert.throws(
    () => parseDecision({ tool: 'invented', arguments: {}, answer: '' }, tools),
    /undiscovered/,
  );
});
