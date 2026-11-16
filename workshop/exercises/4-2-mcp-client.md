# Exercise 4.2: Writing an MCP client

Write a small Node client that starts the cinema server, asks what it offers, and uses a tool, a resource and a prompt once each. Every MCP host runs a client like this.

- **Terminal exercise** (http://127.0.0.1:4200/lab/4-2 lists the commands)
- **You edit:** `tools/lab/mcp-client.ts`
- **Check:** `pnpm lab:check 4-2`
- **Time:** ~15 min
- **Level:** core

You need neither the app nor Chrome. Build the server, then run the client after every step:

```sh
pnpm nx build cinema-mcp
pnpm lab:mcp-client
```

It stops at the first unfinished step with a 🧩 hint. `main()` at the bottom is finished: it calls your five functions and prints the results. This exercise does not depend on 4.1. If your 4.1 files do not compile, run `pnpm lab:reset 4-1` first.

## 1. Start the server and connect

A local server runs as a child process. Client and server talk over its stdin and stdout.

In `connect()`:

- Create a `Client` with a `name` and a `version`.
- Create a `StdioClientTransport` with `command: process.execPath` and `args: [serverEntry]`.
- Connect them and return the client.

<details>
  <summary>Solution: <code>connect()</code></summary>

```ts
// tools/lab/mcp-client.ts
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
```

</details>

### Run it

You see `✔ Connected to nano-cinema 1.0.0 (protocol …)`.

## 2. List tools, resources and prompts

A client never hard-codes what a server can do. It asks.

In `listCapabilities()`, call `client.listTools()`, `client.listResources()` and `client.listPrompts()`. Return the tool names, the resource URIs and the prompt names.

<details>
  <summary>Solution: <code>listCapabilities()</code></summary>

```ts
// tools/lab/mcp-client.ts
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
```

</details>

### Run it

You see `search_movies` (plus `get_movie` if you did 4.1), three `cinema://movies/…` resources and `film_club_discussion`.

## 3. Call a tool

A tool error is not thrown. It comes back as a normal result with `isError: true`.

In `searchMovies()`:

- Call `client.callTool({ name: 'search_movies', arguments: { query } })`.
- Find the `text` block in `result.content`.
- Throw an `Error` when the result is an error or has no text block.
- Return `JSON.parse(block.text)` as `MovieHit[]`.

<details>
  <summary>Hint · skeleton: <code>searchMovies()</code></summary>

```ts
// tools/lab/mcp-client.ts
export async function searchMovies(
  client: Client,
  query: string,
): Promise<MovieHit[]> {
  const result = /* call search_movies with { query } */;
  const block = /* the first content item of type 'text' */;
  if (/* an error, no block, or not a text block */)
    throw new Error(/* say what failed */);
  return /* the parsed JSON text */ as MovieHit[];
}
```

</details>

<details>
  <summary>Solution: <code>searchMovies()</code></summary>

```ts
// tools/lab/mcp-client.ts
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
```

</details>

### Run it

You see `Sintel (2010) · Fantasy · cinema://movies/sintel`.

## 4. Read a resource

In `readNotes()`, read `cinema://movies/<movieId>` with `client.readResource({ uri })`. Take the first item of `contents`, throw an `Error` when it has no `text`, and return the parsed JSON as a `Movie`.

<details>
  <summary>Hint · skeleton: <code>readNotes()</code></summary>

```ts
// tools/lab/mcp-client.ts
export async function readNotes(
  client: Client,
  movieId: string,
): Promise<Movie> {
  const { contents } = /* read cinema://movies/<movieId> */;
  const content = contents[0];
  if (/* no content, or no text in it */)
    throw new Error(/* say which URI returned no text */);
  return /* the parsed JSON text */ as Movie;
}
```

</details>

<details>
  <summary>Solution: <code>readNotes()</code></summary>

```ts
// tools/lab/mcp-client.ts
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
```

</details>

### Run it

You see `Sintel, directed by Colin Levy`.

## 5. Get a prompt

An MCP prompt is a message template. `getPrompt()` returns messages, not an answer: a host sends them to its own model.

In `getDiscussionPrompt()`, get `film_club_discussion` with `{ movieId }`. Take the `content` of the first message, throw an `Error` when it is not text, and return its `text`.

<details>
  <summary>Hint · skeleton: <code>getDiscussionPrompt()</code></summary>

```ts
// tools/lab/mcp-client.ts
export async function getDiscussionPrompt(
  client: Client,
  movieId: string,
): Promise<string> {
  const prompt = /* get film_club_discussion with { movieId } */;
  const content = /* the content of the first message */;
  if (/* no content, or not a text message */)
    throw new Error(/* say that no text message came back */);
  return content.text;
}
```

</details>

<details>
  <summary>Solution: <code>getDiscussionPrompt()</code></summary>

```ts
// tools/lab/mcp-client.ts
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
```

</details>

### Run it

The demo runs to the end and prints the prompt text.

A real host does the same as your `main()`, but its model chooses the calls. With a cloud model, tool descriptions and results cost tokens on every request.

---

## Check your work

```sh
pnpm lab:check 4-2
```

All 5 checks should pass.

Stuck?

- `pnpm lab:solve 4-2` puts the solution in place and keeps your file as `mcp-client.ts.mine`.
- `pnpm lab:reset 4-2` restores the starter.

| You see                                     | What to do                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `Did you build the server?`                 | Read the ✖ line above it first. Build only if `dist/main.js` is missing. |
| `Connection closed` right after starting    | Run `node apps/cinema-mcp/dist/main.js` alone to see the server error.    |
| `search_movies failed: … expected string …` | Pass arguments that match the schema, such as `{ query: 'fantasy' }`.     |
| `Unexpected token … in JSON`                | Parse `block.text`, the JSON string inside the result.                    |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** `apps/cinema-mcp/src/server.test.ts` uses the same client code as an automated test.

## Bonus

- With 4.1 done, read `cinema://movies/dream/captions` and print the first three cues.
- Call `readNotes(client, 'titanic')`, catch the error and print the message.
- Call `search_movies` with `{ query: 42 }` and print the `isError` result. This is what a model would see.
