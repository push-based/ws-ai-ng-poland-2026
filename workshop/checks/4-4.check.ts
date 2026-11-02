import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SimulatedModelContext, step, withoutGlobal } from './harness';
import {
  Watchlist,
  getModelContext,
  readMovieId,
  registerAll,
  watchlistTools,
  type ModelContextLike,
  type ToolResult,
} from '../../apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise';
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

/** Node has no `document`: provide a tiny fake one while `work` runs. */
async function withDocument<T>(
  value: unknown,
  work: () => T | Promise<T>,
): Promise<T> {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    value,
    configurable: true,
    writable: true,
  });
  try {
    return await work();
  } finally {
    if (before) Object.defineProperty(globalThis, 'document', before);
    else delete (globalThis as Record<string, unknown>)['document'];
  }
}

function payload(result: ToolResult): Record<string, unknown> {
  assert.equal(
    result?.content?.[0]?.type,
    'text',
    'return toolResult({...}): { content: [{ type: "text", text }] }',
  );
  return JSON.parse(result.content[0].text);
}

function tool(watchlist: Watchlist, name: string) {
  const found = watchlistTools(watchlist).find(
    (candidate) => candidate.name === name,
  );
  assert.ok(found, `add a tool named "${name}"`);
  return found;
}

test('Step 1 · getModelContext() reads document.modelContext and is safe without a document', async () => {
  const context = new SimulatedModelContext();
  const found = await withDocument({ modelContext: context }, () =>
    step('Step 1 (getModelContext)', () => getModelContext()),
  );
  assert.equal(found, context, 'return document.modelContext');
  assert.equal(
    await withDocument({}, () => getModelContext()),
    undefined,
    'return undefined when the browser has no WebMCP',
  );
  await withoutGlobal('document', () =>
    assert.doesNotThrow(
      () => assert.equal(getModelContext(), undefined),
      'check `typeof document` first, so Node and workers get undefined, not a ReferenceError',
    ),
  );
});

test('Step 2 · readMovieId() accepts exactly { movieId } with a real catalogue id', async () => {
  assert.equal(
    await step('Step 2 (readMovieId)', () =>
      readMovieId({ movieId: 'sintel' }),
    ),
    'sintel',
    'return the movieId',
  );
  assert.throws(
    () => readMovieId({ movieId: 'titanic' }),
    Error,
    'reject ids that are not in movieIds',
  );
  assert.throws(
    () => readMovieId({ movieId: 42 }),
    Error,
    'reject a movieId that is not a string',
  );
  assert.throws(
    () => readMovieId({ movieId: 'sintel', note: 'hi' }),
    Error,
    'reject unknown keys (the schema says additionalProperties: false)',
  );
  assert.throws(() => readMovieId({}), Error, 'reject a missing movieId');
  assert.throws(() => readMovieId(null), Error, 'reject null');
  assert.throws(
    () => readMovieId('sintel'),
    Error,
    'reject a plain string: arguments are an object',
  );
});

test('Step 3 · watchlistTools() describes three tools with honest hints and schemas', async () => {
  const tools = await step('Step 3 (watchlistTools)', () =>
    watchlistTools(new Watchlist()),
  );
  assert.deepEqual(
    tools.map((t) => t.name).sort(),
    ['add_to_watchlist', 'get_watchlist', 'remove_from_watchlist'],
    'return exactly get_watchlist, add_to_watchlist and remove_from_watchlist',
  );
  for (const t of tools) {
    assert.ok(
      t.description.length > 15,
      `give ${t.name} a description an agent can choose by`,
    );
    assert.equal(
      t.inputSchema['type'],
      'object',
      `${t.name}: inputSchema must be a JSON Schema object`,
    );
    assert.equal(
      typeof t.execute,
      'function',
      `${t.name}: add an execute function`,
    );
  }
  assert.equal(
    tool(new Watchlist(), 'get_watchlist').annotations?.readOnlyHint,
    true,
    'get_watchlist only reads: annotations: { readOnlyHint: true }',
  );
  assert.notEqual(
    tool(new Watchlist(), 'add_to_watchlist').annotations?.readOnlyHint,
    true,
    'add_to_watchlist changes state: it must not claim readOnlyHint',
  );
  assert.deepEqual(
    tool(new Watchlist(), 'add_to_watchlist').inputSchema['required'],
    ['movieId'],
    'use movieIdSchema for add_to_watchlist',
  );
});

test('Step 3 · execute() validates its own arguments and returns structured content', async () => {
  const watchlist = new Watchlist();
  const add = await step('Step 3 (watchlistTools)', () =>
    tool(watchlist, 'add_to_watchlist'),
  );
  const added = payload(
    await anyStep('Step 3 (execute)', () => add.execute({ movieId: 'dream' })),
  );
  assert.equal(
    added['added'],
    true,
    'add_to_watchlist: report { added: true } for a new film',
  );
  assert.deepEqual(
    watchlist.list().map((m) => m.id),
    ['dream'],
    'add_to_watchlist: call watchlist.add(movieId)',
  );
  await assert.rejects(
    add.execute({ movieId: 'titanic' }),
    Error,
    'add_to_watchlist: validate with readMovieId(args) and throw for unknown ids',
  );
  await assert.rejects(
    add.execute({ movieId: 'sintel', priority: 'high' }),
    Error,
    'add_to_watchlist: reject unknown keys',
  );
  assert.deepEqual(
    watchlist.list().map((m) => m.id),
    ['dream'],
    'a rejected call must not change the watchlist',
  );
  const read = payload(await tool(watchlist, 'get_watchlist').execute({}));
  assert.deepEqual(
    read['watchlist'],
    [{ id: 'dream', title: 'Elephants Dream' }],
    'get_watchlist: return { watchlist: watchlist.list() }',
  );
  await assert.rejects(
    tool(watchlist, 'get_watchlist').execute({ movieId: 'dream' }),
    Error,
    'get_watchlist takes no arguments: reject any key',
  );
  const removed = payload(
    await tool(watchlist, 'remove_from_watchlist').execute({
      movieId: 'dream',
    }),
  );
  assert.equal(
    removed['removed'],
    true,
    'remove_from_watchlist: report { removed: true }',
  );
  assert.deepEqual(
    watchlist.list(),
    [],
    'remove_from_watchlist: call watchlist.remove(movieId)',
  );
  await assert.rejects(
    tool(watchlist, 'remove_from_watchlist').execute({ movieId: 'nope' }),
    Error,
    'remove_from_watchlist: validate with readMovieId(args)',
  );
});

test('Step 4 · registerAll() registers every tool with the signal; abort() unregisters them', async () => {
  const context = new SimulatedModelContext();
  const controller = new AbortController();
  const watchlist = new Watchlist();
  const seen: { signal?: AbortSignal }[] = [];
  const recording: ModelContextLike = {
    registerTool: (t, options) => {
      seen.push(options ?? {});
      return context.registerTool(t, options);
    },
  };
  const tools = await step('Step 3 (watchlistTools)', () =>
    watchlistTools(watchlist),
  );
  await step('Step 4 (registerAll)', () =>
    registerAll(recording, tools, controller.signal),
  );
  assert.equal(seen.length, 3, 'call context.registerTool() once per tool');
  assert.ok(
    seen.every((options) => options.signal === controller.signal),
    'pass { signal } as the second argument of registerTool()',
  );
  const names = (await context.getTools()).map((t) => t.name);
  assert.deepEqual(
    names,
    ['add_to_watchlist', 'get_watchlist', 'remove_from_watchlist'],
    'the browser should now list the three tools',
  );
  await context.executeTool({ name: 'add_to_watchlist' }, { movieId: 'bunny' });
  assert.deepEqual(
    watchlist.list().map((m) => m.id),
    ['bunny'],
    'executeTool() through the browser should reach your execute()',
  );
  controller.abort();
  assert.deepEqual(
    await context.getTools(),
    [],
    'aborting the signal should unregister every tool',
  );
});
