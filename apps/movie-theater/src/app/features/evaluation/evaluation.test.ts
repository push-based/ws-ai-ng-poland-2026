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

test('agent contract keeps arguments typed, accepts empty read arguments and bounds the whole plan', async () => {
  const { parameterSchema, parsePlan } = await import('./evaluation.agent.js');
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
    parameterSchema(tools[1]).properties.arguments.properties['seconds'],
    { type: 'number' },
  );
  assert.deepEqual(
    parsePlan(
      {
        actions: [{ tool: 'get_screening_state', arguments: {} }],
        explanation: 'Read state',
      },
      tools,
    ).actions[0].args,
    {},
  );
  assert.throws(
    () =>
      parsePlan(
        { actions: [{ tool: 'seek_to', arguments: '' }], explanation: 'Seek' },
        tools,
      ),
    /object/,
  );
  assert.throws(
    () =>
      parsePlan(
        {
          actions: [{ tool: 'invented', arguments: {} }],
          explanation: 'Unknown',
        },
        tools,
      ),
    /undiscovered/,
  );
  assert.throws(
    () =>
      parsePlan(
        {
          actions: Array(7).fill({ tool: 'seek_to', arguments: {} }),
          explanation: 'Too many',
        },
        tools,
      ),
    /malformed/,
  );
});

test('executor finishes the approved finite plan once and rejects the entire plan before any invalid mutation', async () => {
  const { executePlan } = await import('./evaluation.executor.js');
  const tools = [
    {
      name: 'seek_to',
      inputSchema: {
        properties: { seconds: { type: 'number', minimum: 0, maximum: 30 } },
        required: ['seconds'],
      },
    },
  ];
  const invoked: number[] = [];
  const invoke = async (action: { args: Record<string, unknown> }) => {
    invoked.push(action.args['seconds'] as number);
  };
  const result = await executePlan(
    {
      actions: [{ tool: 'seek_to', args: { seconds: 6 } }],
      explanation: 'Seek',
    },
    tools,
    invoke,
    new AbortController().signal,
  );
  assert.equal(result.completed, true);
  assert.deepEqual(invoked, [6]);
  invoked.length = 0;
  const rejected = await executePlan(
    {
      actions: [
        { tool: 'seek_to', args: { seconds: 6 } },
        { tool: 'seek_to', args: { seconds: 99 } },
      ],
      explanation: 'Seek twice',
    },
    tools,
    invoke,
    new AbortController().signal,
  );
  assert.deepEqual(invoked, []);
  assert.match(rejected.calls[0].error ?? '', /range/);
});

test('executor stops on a handler failure or cancellation without retrying or performing later steps', async () => {
  const { executePlan } = await import('./evaluation.executor.js');
  const tools = [{ name: 'read', inputSchema: { properties: {} } }];
  const plan = {
    actions: [
      { tool: 'read', args: {} },
      { tool: 'read', args: {} },
    ],
    explanation: 'Read',
  };
  let calls = 0;
  const failed = await executePlan(
    plan,
    tools,
    async () => {
      calls++;
      throw new Error('Partial action failed');
    },
    new AbortController().signal,
  );
  assert.equal(failed.completed, false);
  assert.equal(calls, 1);
  const controller = new AbortController();
  calls = 0;
  await assert.rejects(
    executePlan(
      plan,
      tools,
      async () => {
        calls++;
        controller.abort();
      },
      controller.signal,
    ),
    /abort/i,
  );
  assert.equal(calls, 1);
});

test('capability disclosure forbids unknown or malformed selections and excludes unrelated tools from argument generation', async () => {
  const { parseSelection, parsePlan, parameterSchema } = await import(
    './evaluation.agent.js'
  );
  const tools = [
    {
      name: 'seek_to',
      inputSchema: {
        properties: { seconds: { type: 'number' } },
        required: ['seconds'],
      },
    },
    {
      name: 'select_movie',
      inputSchema: {
        properties: { movieId: { enum: ['sintel', 'bunny'] } },
        required: ['movieId'],
      },
    },
  ];
  const selection = parseSelection(
    {
      tools: { seek_to: true, select_movie: false },
      explanation: 'Move the playhead',
    },
    tools,
  );
  assert.equal(selection.tools.length, 1);
  assert.deepEqual(
    parameterSchema(selection.tools[0]).properties.arguments.properties,
    { seconds: { type: 'number' } },
  );
  assert.throws(
    () =>
      parseSelection(
        {
          tools: { seek_to: 'yes', select_movie: false },
          explanation: 'Invalid flag',
        },
        tools,
      ),
    /Malformed/,
  );
  assert.throws(
    () =>
      parseSelection(
        {
          tools: { seek_to: false, select_movie: false, invented: true },
          explanation: 'Unknown',
        },
        tools,
      ),
    /Undiscovered/,
  );
  assert.throws(
    () =>
      parsePlan(
        {
          actions: [{ tool: 'select_movie', arguments: { movieId: 'sintel' } }],
          explanation: 'Not selected',
        },
        selection.tools,
      ),
    /undiscovered/,
  );
  assert.throws(
    () =>
      parsePlan(
        {
          actions: [
            { tool: 'seek_to', arguments: { seconds: 6 } },
            { tool: 'seek_to', arguments: { seconds: 7 } },
          ],
          explanation: 'Repeated',
        },
        selection.tools,
      ),
    /malformed/,
  );
});

test('parameter proposals cannot change the selected operation and carry explicit refusal flags', async () => {
  const { parameterSchema, parseParameters } = await import(
    './evaluation.agent.js'
  );
  const tool = {
    name: 'seek_to',
    inputSchema: {
      properties: { seconds: { type: 'number' } },
      required: ['seconds'],
    },
  };
  const schema = parameterSchema(tool);
  assert.deepEqual(Object.keys(schema.properties.arguments.properties), [
    'seconds',
  ]);
  assert.equal('tool' in schema.properties, false);
  assert.deepEqual(
    parseParameters({
      needed: true,
      valid: true,
      arguments: { seconds: 6 },
      explanation: 'Seek',
    }).args,
    { seconds: 6 },
  );
  assert.equal(
    parseParameters({
      needed: true,
      valid: false,
      arguments: {},
      explanation: 'Out of range',
    }).valid,
    false,
  );
  assert.throws(
    () =>
      parseParameters({
        needed: 'yes',
        valid: true,
        arguments: {},
        explanation: 'Wrong type',
      }),
    /Malformed/,
  );
});
