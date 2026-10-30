// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.2 · Writing an MCP client — SOLUTION
// Copy into place with: pnpm lab:solve 4-2
//
// Roles: this file is an MCP CLIENT. It starts the cinema MCP SERVER
// (apps/cinema-mcp/dist/main.js) as a child process and talks to it over
// stdin/stdout. An MCP HOST (VS Code, Claude Code, an IDE…) contains a client
// like this one and hands the discovered tools to its model.
// ─────────────────────────────────────────────────────────────────────────────
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import type { Movie } from '../../libs/catalogue/src/index';

/** The compiled server. Build it with: pnpm nx build cinema-mcp */
export const serverEntry = fileURLToPath(
  new URL('../../apps/cinema-mcp/dist/main.js', import.meta.url),
);

/** What listCapabilities() returns: just the names and URIs. */
export interface Capabilities {
  tools: string[];
  resources: string[];
  prompts: string[];
}

/** One search_movies hit, as the server's tool returns it. */
export interface MovieHit {
  id: string;
  title: string;
  year: number;
  genre: string;
  mood: string;
  description: string;
  audioLanguage: string;
  notesUri: string;
}

/**
 * STEP 1 · Start the server and connect.
 * Create a Client, a StdioClientTransport that runs `node <serverEntry>`
 * (use process.execPath for "node"), and connect them.
 */
export async function connect(): Promise<Client> {
  const client = new Client({
    name: 'nano-cinema-lab-client',
    version: '1.0.0',
  });
  // The transport starts the server as a child process: node <serverEntry>.
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
  });
  await client.connect(transport);
  return client;
}

/**
 * STEP 2 · Discovery: ask the server what it offers.
 * Return the tool names, resource URIs and prompt names.
 */
export async function listCapabilities(client: Client): Promise<Capabilities> {
  const { tools } = await client.listTools();
  const { resources } = await client.listResources();
  const { prompts } = await client.listPrompts();
  return {
    tools: tools.map((tool) => tool.name),
    resources: resources.map((resource) => resource.uri),
    prompts: prompts.map((prompt) => prompt.name),
  };
}

/**
 * STEP 3 · Call a tool.
 * Call search_movies with { query }, read the text block of the result and
 * parse it as JSON. A tool error comes back as a result with isError: true.
 */
export async function searchMovies(
  client: Client,
  query: string,
): Promise<MovieHit[]> {
  const result = await client.callTool({
    name: 'search_movies',
    arguments: { query },
  });
  const block = result.content.find((item) => item.type === 'text');
  if (result.isError || !block || block.type !== 'text')
    throw new Error(
      `search_movies failed: ${block?.type === 'text' ? block.text : 'no text'}`,
    );
  return JSON.parse(block.text) as MovieHit[];
}

/**
 * STEP 4 · Read a resource.
 * Read cinema://movies/<movieId> and parse its JSON text into a Movie.
 */
export async function readNotes(
  client: Client,
  movieId: string,
): Promise<Movie> {
  const { contents } = await client.readResource({
    uri: `cinema://movies/${movieId}`,
  });
  const content = contents[0];
  if (!content || !('text' in content))
    throw new Error(`cinema://movies/${movieId} returned no text.`);
  return JSON.parse(content.text) as Movie;
}

/**
 * STEP 5 · Get a prompt.
 * Ask for the film_club_discussion prompt and return the text of its first
 * message. Note: this returns INSTRUCTIONS for a model. No model runs here.
 */
export async function getDiscussionPrompt(
  client: Client,
  movieId: string,
): Promise<string> {
  const prompt = await client.getPrompt({
    name: 'film_club_discussion',
    arguments: { movieId },
  });
  const content = prompt.messages[0]?.content;
  if (!content || content.type !== 'text')
    throw new Error('film_club_discussion returned no text message.');
  return content.text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Given: a small demo that runs every step and prints the results.
// ─────────────────────────────────────────────────────────────────────────────
export async function main(): Promise<void> {
  console.log(`\n▶ Starting the cinema MCP server: node ${serverEntry}\n`);
  const client = await connect();
  try {
    const server = client.getServerVersion();
    console.log(
      `✔ Connected to ${server?.name} ${server?.version} (protocol ${client.getNegotiatedProtocolVersion()})\n`,
    );

    const capabilities = await listCapabilities(client);
    console.log('Tools     :', capabilities.tools.join(', '));
    console.log('Resources :', capabilities.resources.join(', '));
    console.log('Prompts   :', capabilities.prompts.join(', '), '\n');

    const hits = await searchMovies(client, 'fantasy');
    console.log('search_movies("fantasy") →');
    for (const hit of hits)
      console.log(
        `  • ${hit.title} (${hit.year}) · ${hit.genre} · ${hit.notesUri}`,
      );

    const notes = await readNotes(client, 'sintel');
    console.log(
      `\nresource cinema://movies/sintel → ${notes.title}, directed by ${notes.director}`,
    );
    console.log(`  "${notes.notes[0].slice(0, 110)}…"`);

    const prompt = await getDiscussionPrompt(client, 'dream');
    console.log(
      '\nprompt film_club_discussion(dream) → a message a host would send to ITS model:',
    );
    console.log(`  "${prompt.slice(0, 160)}…"\n`);
  } finally {
    await client.close();
  }
}

// Run main() only for `pnpm lab:mcp-client`, not when the check imports this file.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    const name = error instanceof Error ? error.name : '';
    console.error(
      name === 'TodoError'
        ? `\n🧩 ${(error as Error).message}\n`
        : `\n✖ ${error instanceof Error ? error.message : String(error)}\n  Did you build the server? pnpm nx build cinema-mcp\n`,
    );
    process.exitCode = 1;
  });
}
