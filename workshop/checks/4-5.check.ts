// Exercise 4.5 runs the agent against the simulated Prompt API and a simulated
// document.modelContext with its own small watchlist tools, so it does not
// depend on exercise 4.4. The simulated model only keyword-matches: it picks a
// tool whose name appears in the request ("add to watchlist") and a film whose
// id or title appears. Choosing 'none' is tested with a scripted stub session.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { SimulatedModelContext, simulate, spy, step } from './harness';
import {
  choiceSchema,
  chooseTool,
  extractArguments,
  runAgent,
  type AgentContext,
} from '../../apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise';
import { isTodo } from '../../apps/movie-theater/src/app/lab/shared/todo';

/** Like step(), but names the step whose todo() was really hit (Step 4 builds on Steps 2–3). */
async function anyStep<T>(
  name: string,
  work: () => T | Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isTodo(error))
      throw new Error(
        `🧩 ${error.step} is not implemented yet: replace the todo(...) line${error.step === name ? '' : ` (needed by ${name})`}.`,
      );
    throw error;
  }
}

const movieSchema = {
  type: 'object',
  properties: {
    movieId: { type: 'string', enum: ['sintel', 'bunny', 'dream'] },
  },
  required: ['movieId'],
  additionalProperties: false,
};
const emptySchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

// Discovered tools, like getTools() returns them (inputSchema as a JSON string).
const discovered = [
  {
    name: 'get_watchlist',
    description: 'Read the watchlist.',
    inputSchema: JSON.stringify(emptySchema),
  },
  {
    name: 'add_to_watchlist',
    description: 'Add one film to the watchlist.',
    inputSchema: JSON.stringify(movieSchema),
  },
  {
    name: 'remove_from_watchlist',
    description: 'Remove one film from the watchlist.',
    inputSchema: JSON.stringify(movieSchema),
  },
];

/** A simulated browser with the three watchlist tools plus one tool the agent must never be offered. */
function browser(t: TestContext) {
  const context = new SimulatedModelContext();
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const controller = new AbortController();
  t.after(() => controller.abort());
  for (const tool of [
    ...discovered,
    {
      name: 'delete_account',
      description: 'Delete the account.',
      inputSchema: JSON.stringify(emptySchema),
    },
  ])
    context.registerTool(
      {
        name: tool.name,
        description: tool.description,
        inputSchema: JSON.parse(tool.inputSchema),
        execute: async (args) => {
          calls.push({ name: tool.name, args });
          return {
            content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
          };
        },
      },
      { signal: controller.signal },
    );
  return { context: context as unknown as AgentContext, calls };
}

/** Record every clone of `base` so the check can see it was destroyed. */
function trackClones(t: TestContext, base: LanguageModel) {
  const clones: { session: LanguageModel; destroyed: boolean }[] = [];
  const clone = base.clone.bind(base);
  Object.defineProperty(base, 'clone', {
    configurable: true,
    value: async (options?: LanguageModelCloneOptions) => {
      const session = await clone(options);
      const entry = { session, destroyed: false };
      const destroy = session.destroy.bind(session);
      Object.defineProperty(session, 'destroy', {
        value: () => ((entry.destroyed = true), destroy()),
      });
      clones.push(entry);
      return session;
    },
  });
  t.after(() => base.destroy());
  return clones;
}

/** A scripted "model" whose clones always answer `answer`. */
function stubSession(answer: string) {
  const session = {
    prompts: 0,
    clone: async () => session,
    append: async () => undefined,
    prompt: async () => {
      session.prompts++;
      return answer;
    },
    destroy: () => undefined,
  };
  return session as unknown as LanguageModel & { prompts: number };
}

test('Step 1 · choiceSchema() allows exactly "none" and the offered tool names', async () => {
  const schema = (await step('Step 1 (choiceSchema)', () =>
    choiceSchema(discovered),
  )) as {
    type?: string;
    properties?: { tool?: { enum?: string[] } };
    required?: string[];
  };
  assert.equal(
    schema.type,
    'object',
    "the schema is an object: { type: 'object', … }",
  );
  const values = schema.properties?.tool?.enum ?? [];
  assert.deepEqual(
    [...values].sort(),
    ['add_to_watchlist', 'get_watchlist', 'none', 'remove_from_watchlist'],
    "properties.tool.enum = ['none', ...tool names]",
  );
  assert.deepEqual(schema.required, ['tool'], "add required: ['tool']");
});

test('Step 2 · chooseTool() decides in a fresh clone with responseConstraint and destroys it', async (t) => {
  simulate(t);
  const base = await LanguageModel.create();
  const clones = trackClones(t, base);
  const before = base.contextUsage;
  const choice = await step('Step 2 (chooseTool)', () =>
    chooseTool(base, 'Add to watchlist: Sintel, please', discovered),
  );
  assert.equal(
    choice,
    'add_to_watchlist',
    'return the parsed `tool` field of the JSON answer',
  );
  assert.equal(
    clones.length,
    1,
    'work in base.clone(), not in the base session',
  );
  assert.ok(clones[0].destroyed, 'destroy the clone in a finally block');
  assert.equal(
    base.contextUsage,
    before,
    'the base session must stay clean (no prompt in the base)',
  );
  await assert.rejects(
    chooseTool(
      stubSession('{"tool":"delete_account"}'),
      'Delete my account',
      discovered,
    ),
    Error,
    'throw when the model returns a name that was not offered',
  );
  assert.equal(
    await chooseTool(
      stubSession('{"tool":"none"}'),
      'What does a bass filter do?',
      discovered,
    ),
    'none',
    "accept 'none'",
  );
});

test('Step 3 · extractArguments() uses the tool schema as responseConstraint in a fresh clone', async (t) => {
  simulate(t);
  const base = await LanguageModel.create();
  const clones = trackClones(t, base);
  const args = await step('Step 3 (extractArguments)', () =>
    extractArguments(base, 'Add to watchlist: Elephants Dream', discovered[1]),
  );
  assert.deepEqual(
    args,
    { movieId: 'dream' },
    'parse the JSON answer of a prompt constrained by parseSchema(tool.inputSchema)',
  );
  assert.ok(
    clones.length >= 1 && clones.every((clone) => clone.destroyed),
    'use a fresh clone and destroy it afterwards',
  );
  await assert.rejects(
    extractArguments(stubSession('["sintel"]'), 'Add sintel', discovered[1]),
    Error,
    'throw when the answer is not a JSON object',
  );
});

test('Step 4 · runAgent() discovers, chooses, extracts and executes exactly once', async (t) => {
  simulate(t);
  const base = await LanguageModel.create();
  t.after(() => base.destroy());
  const { context, calls } = browser(t);
  const getTools = spy(t, context, 'getTools');
  const run = await anyStep('Step 4 (runAgent)', () =>
    runAgent('Add to watchlist: Sintel', context, base),
  );
  assert.equal(
    getTools.calls.length,
    1,
    'discover the tools with context.getTools()',
  );
  assert.equal(run.tool, 'add_to_watchlist', 'return the chosen tool name');
  assert.deepEqual(
    run.args,
    { movieId: 'sintel' },
    'return the extracted arguments',
  );
  assert.deepEqual(
    calls,
    [{ name: 'add_to_watchlist', args: { movieId: 'sintel' } }],
    'execute the chosen tool exactly once, through the browser',
  );
  assert.ok(run.result, 'return the tool result');
});

test("Step 4 · runAgent() stops on 'none' and never offers tools outside `allowed`", async (t) => {
  const { context, calls } = browser(t);
  // First prove that Step 4 runs a tool, so the 'none' case below is meaningful.
  await anyStep('Step 4 (runAgent)', () =>
    runAgent(
      'Show my watchlist',
      context,
      stubSession('{"tool":"get_watchlist"}'),
    ),
  );
  assert.equal(calls.length, 1, 'execute the chosen tool');
  const none = stubSession('{"tool":"none"}');
  const answer = await runAgent('What does a bass filter do?', context, none);
  assert.deepEqual(
    answer,
    { tool: 'none', args: {}, result: null },
    "return { tool: 'none', args: {}, result: null } for 'none'",
  );
  assert.equal(calls.length, 1, "'none' must not execute anything");
  assert.equal(none.prompts, 1, "after 'none' do not ask the model again");
  await assert.rejects(
    runAgent(
      'Delete my account',
      context,
      stubSession('{"tool":"delete_account"}'),
    ),
    Error,
    'filter getTools() by `allowed`: delete_account must never be offered or run',
  );
  assert.equal(calls.length, 1, 'a rejected choice must not execute anything');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    runAgent('Show my watchlist', context, none, controller.signal),
    'honour an aborted signal before doing any work',
  );
  assert.equal(calls.length, 1, 'an aborted run must not execute anything');
});
