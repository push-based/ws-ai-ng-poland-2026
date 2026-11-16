// Exercise 4.1 runs the REAL compiled MCP server (apps/cinema-mcp/dist/main.js,
// rebuilt by `pnpm lab:check 4-1`) and talks to it over stdio, like a host would.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { getMovie } from './harness';

const serverEntry = fileURLToPath(
  new URL('../../apps/cinema-mcp/dist/main.js', import.meta.url),
);
const templateUri = 'cinema://movies/{movieId}/captions';
let client: Client;

before(async () => {
  client = new Client({ name: 'lab-check-4-1', version: '1.0.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
    }),
  );
});
after(() => client?.close());

function text(result: { content?: unknown[] }): string {
  const block = (result.content ?? []).find(
    (item): item is { type: 'text'; text: string } =>
      (item as { type?: string }).type === 'text',
  );
  return block?.text ?? '';
}

async function getMovieTool() {
  const tool = (await client.listTools()).tools.find(
    (candidate) => candidate.name === 'get_movie',
  );
  if (!tool)
    throw new Error(
      '🧩 Step 1 (registerGetMovie) is not done yet: the server has no tool named "get_movie".',
    );
  return tool;
}

async function captionsTemplate() {
  const { resourceTemplates } = await client.listResourceTemplates();
  const template = resourceTemplates.find(
    (candidate) => candidate.uriTemplate === templateUri,
  );
  if (!template)
    throw new Error(
      `🧩 Step 3 (registerCaptionResources) is not done yet: no resource template "${templateUri}".`,
    );
  return template;
}

test('Step 1 · get_movie is listed with a strict movieId enum and readOnlyHint', async () => {
  const tool = await getMovieTool();
  assert.ok(
    tool.description && tool.description.length > 20,
    'give get_movie a description the host model can read: one full sentence (more than 20 characters)',
  );
  const movieId = (
    tool.inputSchema.properties as
      | Record<string, { enum?: string[] }>
      | undefined
  )?.['movieId'];
  assert.ok(
    movieId,
    'the input schema needs a movieId field: z.object({ movieId: … })',
  );
  assert.deepEqual(
    [...(movieId.enum ?? [])].sort(),
    ['bunny', 'dream', 'sintel'],
    "use z.enum(['sintel', 'bunny', 'dream']) for movieId",
  );
  assert.deepEqual(
    tool.inputSchema.required,
    ['movieId'],
    'movieId must be required (do not use .optional())',
  );
  assert.equal(
    tool.inputSchema.additionalProperties,
    false,
    'call .strict() on the schema so extra keys are rejected',
  );
  assert.equal(
    tool.annotations?.readOnlyHint,
    true,
    'add annotations: { readOnlyHint: true }',
  );
  const tools = (await client.listTools()).tools.map(
    (candidate) => candidate.name,
  );
  assert.equal(
    tools[0],
    'search_movies',
    'keep search_movies registered first (server.ts calls registerGetMovie last)',
  );
});

test('Step 2 · get_movie returns the real catalogue facts as JSON text', async () => {
  await getMovieTool();
  const result = await client.callTool({
    name: 'get_movie',
    arguments: { movieId: 'sintel' },
  });
  assert.notEqual(result.isError, true, `get_movie failed: ${text(result)}`);
  let facts: Record<string, unknown>;
  try {
    facts = JSON.parse(text(result));
  } catch {
    throw new Error(
      `🧩 Step 2 (handler) is not done yet: return JSON.stringify(facts) as text, got "${text(result).slice(0, 60)}".`,
    );
  }
  const sintel = getMovie('sintel');
  assert.equal(facts['id'], 'sintel', 'include the id');
  assert.equal(
    facts['title'],
    sintel.title,
    'include the title from getMovie(movieId)',
  );
  assert.equal(
    facts['director'],
    'Colin Levy',
    'include the director from getMovie(movieId)',
  );
  assert.equal(facts['year'], sintel.year, 'include the year');
  assert.equal(
    facts['notesUri'],
    'cinema://movies/sintel',
    'add notesUri: `cinema://movies/${id}` so a host can read the notes next',
  );
  assert.equal(
    facts['notes'],
    undefined,
    'return the short facts, not the long notes (those are a resource)',
  );
});

test('Step 2 · get_movie rejects an id that is not in the catalogue', async () => {
  await getMovieTool();
  // First make sure the valid call works, so the rejection below is a real result.
  const valid = await client.callTool({
    name: 'get_movie',
    arguments: { movieId: 'dream' },
  });
  assert.match(
    text(valid),
    /Bassam Kurdali/,
    '🧩 Step 2 (handler): get_movie("dream") should return Elephants Dream',
  );
  let rejected = false;
  try {
    const invalid = await client.callTool({
      name: 'get_movie',
      arguments: { movieId: 'titanic' },
    });
    rejected = invalid.isError === true;
  } catch {
    rejected = true;
  }
  assert.ok(
    rejected,
    'an unknown movieId must be an error: use z.enum([...]) so the SDK rejects it',
  );
  const extra = await client
    .callTool({
      name: 'get_movie',
      arguments: { movieId: 'dream', plot: 'spoil it' },
    })
    .catch(() => ({ isError: true }));
  assert.equal(
    extra.isError,
    true,
    'call .strict() so unknown keys are rejected too',
  );
});

test('Step 3 · the captions resource template is listed (and not as a fixed resource)', async () => {
  const template = await captionsTemplate();
  assert.equal(
    template.name,
    'movie_captions',
    "register it with the name 'movie_captions'",
  );
  assert.equal(
    template.mimeType,
    'application/json',
    "set mimeType: 'application/json'",
  );
  assert.ok(
    template.description,
    'add a description so a host knows what the cues contain',
  );
  const { resources } = await client.listResources();
  assert.equal(
    resources.length,
    3,
    'keep the three notes resources; pass { list: undefined } to the template',
  );
});

test('Step 4 · reading cinema://movies/<id>/captions returns timed cues; unknown ids fail', async () => {
  await captionsTemplate();
  const read = await client.readResource({
    uri: 'cinema://movies/dream/captions',
  });
  const content = read.contents[0] as
    | { uri: string; mimeType?: string; text?: string }
    | undefined;
  assert.ok(
    content?.text,
    '🧩 Step 4 (read callback): return { contents: [{ uri: uri.href, mimeType, text }] }',
  );
  assert.equal(
    content.uri,
    'cinema://movies/dream/captions',
    'use uri.href as the content uri',
  );
  const body = JSON.parse(content.text) as {
    cues?: { start: number; end: number; text: string }[];
  };
  assert.ok(
    Array.isArray(body.cues) && body.cues.length > 0,
    'return the cues as { cues: movie.captions }',
  );
  assert.deepEqual(
    body.cues[0],
    getMovie('dream').captions[0],
    'return the real caption cues with start, end and text',
  );
  const bunny = (
    await client.readResource({ uri: 'cinema://movies/bunny/captions' })
  ).contents[0] as { text?: string };
  assert.deepEqual(
    JSON.parse(bunny.text ?? '{}').cues,
    [],
    'Big Buck Bunny has no dialogue: its cues list is empty, not an error',
  );
  await assert.rejects(
    () => client.readResource({ uri: 'cinema://movies/titanic/captions' }),
    'throw an error (for example ResourceNotFoundError) for an unknown movieId',
  );
});
