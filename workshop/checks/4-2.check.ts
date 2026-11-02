// Exercise 4.2 imports the participant's client functions and runs them against
// the REAL compiled cinema MCP server (rebuilt by `pnpm lab:check 4-2`).
// Steps 2–5 get a connection made by the check itself, so each step is checked
// on its own even while Step 1 is unfinished.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { getMovie, step } from './harness';
import {
  connect,
  getDiscussionPrompt,
  listCapabilities,
  readNotes,
  searchMovies,
  serverEntry,
} from '../../tools/lab/mcp-client';

let client: Client;

before(async () => {
  client = new Client({ name: 'lab-check-4-2', version: '1.0.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
    }),
  );
});
after(() => client?.close());

test('Step 1 · connect() starts the server over stdio and completes the handshake', async () => {
  const mine = await step('Step 1 (connect)', () => connect());
  try {
    assert.ok(mine instanceof Client, 'return the Client you created');
    assert.equal(
      mine.getServerVersion()?.name,
      'nano-cinema',
      'await client.connect(transport) before returning the client',
    );
    assert.ok(
      (await mine.listTools()).tools.length > 0,
      'the connected client should be able to list tools',
    );
  } finally {
    await mine.close();
  }
});

test('Step 2 · listCapabilities() returns tool names, resource URIs and prompt names', async () => {
  const capabilities = await step('Step 2 (listCapabilities)', () =>
    listCapabilities(client),
  );
  assert.ok(
    capabilities.tools.includes('search_movies'),
    'tools: map listTools().tools to their name',
  );
  assert.deepEqual(
    [...capabilities.resources].sort(),
    [
      'cinema://movies/bunny',
      'cinema://movies/dream',
      'cinema://movies/sintel',
    ],
    'resources: map listResources().resources to their uri',
  );
  assert.deepEqual(
    capabilities.prompts,
    ['film_club_discussion'],
    'prompts: map listPrompts().prompts to their name',
  );
});

test('Step 3 · searchMovies() calls the tool and parses its JSON text', async () => {
  const hits = await step('Step 3 (searchMovies)', () =>
    searchMovies(client, 'fantasy'),
  );
  assert.ok(
    Array.isArray(hits),
    'return JSON.parse(text) of the text content block: an array',
  );
  assert.deepEqual(
    hits.map((hit) => hit.id),
    ['sintel'],
    'pass { query } as the tool arguments',
  );
  assert.equal(
    hits[0].notesUri,
    'cinema://movies/sintel',
    'return the parsed objects unchanged',
  );
  assert.deepEqual(
    await searchMovies(client, 'no such film'),
    [],
    'an empty search is an empty array, not an error',
  );
});

test('Step 4 · readNotes() reads cinema://movies/<id> and returns the Movie', async () => {
  const movie = await step('Step 4 (readNotes)', () =>
    readNotes(client, 'sintel'),
  );
  assert.equal(
    movie.id,
    'sintel',
    'read the uri `cinema://movies/${movieId}` and JSON.parse its text',
  );
  assert.equal(
    movie.director,
    'Colin Levy',
    'return the whole Movie object from the resource',
  );
  assert.deepEqual(
    movie.notes,
    getMovie('sintel').notes,
    'the notes should be the curated catalogue notes',
  );
  await assert.rejects(
    readNotes(client, 'titanic'),
    'an unknown movie id should reject (the server reports it)',
  );
});

test('Step 5 · getDiscussionPrompt() returns the prompt text (no model runs)', async () => {
  const text = await step('Step 5 (getDiscussionPrompt)', () =>
    getDiscussionPrompt(client, 'dream'),
  );
  assert.equal(typeof text, 'string', 'return messages[0].content.text');
  assert.match(
    text,
    /discussion questions/,
    "ask for the 'film_club_discussion' prompt",
  );
  assert.ok(
    text.includes(getMovie('dream').notes[0]),
    'pass { movieId } as the prompt arguments',
  );
});
