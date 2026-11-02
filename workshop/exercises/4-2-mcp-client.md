# Exercise 4.2: Writing an MCP client

In exercise 4.1 you worked on the server. In this exercise we will write the other side: a small Node client that starts the cinema server, asks what it offers, and uses a tool, a resource and a prompt once each. VS Code, Claude Code and every other MCP host run a client like this one before they show the tools to their model.

**Terminal exercise** (http://127.0.0.1:4200/lab/4-2 lists the commands) · **You edit:** `tools/lab/mcp-client.ts` · **Check:** `pnpm lab:check 4-2` · **Time:** ~15 min · **Level:** core

## Goal

At the end of this exercise `pnpm lab:mcp-client` runs to the end and prints the server's name, its tools, resources and prompts, a `search_movies` hit, Sintel's notes and the film-club prompt text.

## 0. Setup

Do the one-time setup from the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop). This exercise runs in the terminal. The client starts the compiled server, so build it first, then run the client. It stops at the first unfinished step, and that's expected:

```sh
pnpm nx build cinema-mcp
pnpm lab:mcp-client
```

You see `🧩 Not implemented yet: exercise 4-2, Step 1 (connect).`

Open `tools/lab/mcp-client.ts`. It has five functions with `return todo(...)` lines, and a finished `main()` at the bottom that calls them and prints the results. `serverEntry` at the top is the absolute path of `apps/cinema-mcp/dist/main.js`. This exercise does not depend on 4.1; if you finished 4.1, you will also see `get_movie` in the tool list.

Three roles we will use throughout:

| Role       | Meaning                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server** | Offers capabilities: our `apps/cinema-mcp`. Runs no model.                                                                                                                       |
| **Client** | One connection to one server. It speaks the protocol: handshake, `tools/list`, `tools/call`, `resources/read`, `prompts/get`, …                                                  |
| **Host**   | The application the user works in: an IDE, a chat app, an agent. It holds one client per server, gives the discovered tools to its model, and runs the calls the model asks for. |

Your script is a client inside a tiny host (`main()`). It has no model: you decide which tool to call, where a real host lets its model decide.

## 1. Start the server and connect

For a local server, MCP uses the stdio transport: the client starts the server as a child process and sends JSON-RPC messages over its stdin and stdout. `client.connect(transport)` starts that process and performs the handshake, in which client and server agree on a protocol version and exchange their names and capabilities.

In `connect()`, create a `Client` with a `name` and a `version`, and a `StdioClientTransport` whose `command` is `process.execPath` (the Node binary running this script, so the server gets the same Node version) and whose `args` are `[serverEntry]`. Connect the two and return the client.

<details>
  <summary>connect() solution</summary>

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

Save and run `pnpm lab:mcp-client`. You see a line like `✔ Connected to nano-cinema 1.0.0 (protocol 2025-11-25)`, followed by the 🧩 hint for Step 2. The protocol version is the one client and server agreed on.

## 2. List tools, resources and prompts

A client never hard-codes what a server can do: it asks. A host passes the tool list (names, descriptions, input schemas) to its model, and that list is how the model learns that a tool exists.

In `listCapabilities()`, call `client.listTools()`, `client.listResources()` and `client.listPrompts()`, and return the tool names, the resource URIs and the prompt names.

<details>
  <summary>listCapabilities() solution</summary>

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

Save and run `pnpm lab:mcp-client`. You see `Tools     : search_movies` (plus `get_movie` if you did 4.1), the three `cinema://movies/…` resources and `film_club_discussion`.

## 3. Call a tool

`client.callTool({ name, arguments })` sends `tools/call`. The server validates the arguments against its schema, runs the handler and returns a result with a list of `content` blocks; our server puts JSON into a `text` block. A tool error, such as invalid arguments, is not thrown: it comes back as a normal result with `isError: true`, so a model can read the message and try again. Our client turns it into an exception.

In `searchMovies()`, call `search_movies` with `{ query }`, find the text block in `result.content`, throw an `Error` when the result is an error or has no text block, and return the parsed JSON as `MovieHit[]`.

> [!TIP]
> Parse `block.text`, the JSON string inside the text block. The result object around it is already parsed: it holds the `content` list and `isError`.

<details>
  <summary>searchMovies() skeleton</summary>

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
  <summary>searchMovies() solution</summary>

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

Why check `block.type !== 'text'` again after `find`? The `find` locates the block; the second check tells TypeScript that `block` is a text block, so `block.text` exists.

</details>

Save and run `pnpm lab:mcp-client`. Under `search_movies("fantasy") →` you see `Sintel (2010) · Fantasy · cinema://movies/sintel`.

## 4. Read a resource

A resource is addressed by a URI. A host lets the user or the application pick resources and attaches them to the model's context; the model doesn't call them on its own. `client.readResource({ uri })` returns a list of `contents`, and each item has the `uri`, a `mimeType` and either `text` or `blob` (binary as base64).

In `readNotes()`, read `cinema://movies/<movieId>`, take the first item of `contents`, throw an `Error` when it has no `text`, and return its parsed JSON as a `Movie`.

<details>
  <summary>readNotes() skeleton</summary>

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
  <summary>readNotes() solution</summary>

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

Save and run `pnpm lab:mcp-client`. You see `resource cinema://movies/sintel → Sintel, directed by Colin Levy` and the start of the first note.

## 5. Get a prompt

An MCP prompt is a reusable message template offered by the server, often shown to users as a slash command in a host. `getPrompt()` returns messages, not an answer: the server fills in the film's notes, and a host then sends these messages to its own model. Nothing in this exercise runs a model, so our client returns the text.

In `getDiscussionPrompt()`, get `film_club_discussion` with `{ movieId }` as its arguments, take the `content` of the first message, throw an `Error` when it is not a text message, and return its `text`.

<details>
  <summary>getDiscussionPrompt() skeleton</summary>

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
  <summary>getDiscussionPrompt() solution</summary>

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

Save and run `pnpm lab:mcp-client`. The whole demo now runs to the end:

```
▶ Starting the cinema MCP server: node /…/ws-ai-ng-poland-2026/apps/cinema-mcp/dist/main.js

✔ Connected to nano-cinema 1.0.0 (protocol 2025-11-25)

Tools     : search_movies
Resources : cinema://movies/sintel, cinema://movies/bunny, cinema://movies/dream
Prompts   : film_club_discussion

search_movies("fantasy") →
  • Sintel (2010) · Fantasy · cinema://movies/sintel

resource cinema://movies/sintel → Sintel, directed by Colin Levy
  "Sintel is an independently produced animated fantasy short directed by Colin Levy and released by the Blender …"

prompt film_club_discussion(dream) → a message a host would send to ITS model:
  "Create three discussion questions using only these programme notes. Distinguish observable details from speculation. Do not invent plot details or reveal an end…"
```

Great job! `main()` closes the client at the end (`await client.close()`), which also stops the server process.

## Check your work

Run:

```sh
pnpm lab:check 4-2
```

It rebuilds the server, imports your five functions and runs them against the real server. Steps 2–5 get a connection made by the check itself, so each step is checked on its own. Expected result:

```
  ✔ Step 1 · connect() starts the server over stdio and completes the handshake
  ✔ Step 2 · listCapabilities() returns tool names, resource URIs and prompt names
  ✔ Step 3 · searchMovies() calls the tool and parses its JSON text
  ✔ Step 4 · readNotes() reads cinema://movies/<id> and returns the Movie
  ✔ Step 5 · getDiscussionPrompt() returns the prompt text (no model runs)

  5 passed, 0 failed
```

### From your client to a real host

A host does what your `main()` does, but a model chooses the calls:

1. Start each configured server and connect (your Step 1).
2. List the tools (Step 2) and put their names, descriptions and input schemas into the model's request.
3. When the model answers "call `search_movies` with `{ "query": "fantasy" }`", run `callTool` (Step 3), often after asking the user, and send the result back to the model.
4. Offer resources and prompts in the UI (Steps 4–5), for example as attachments or slash commands.

If the host's model is a cloud model, steps 2 and 3 cost tokens: tool descriptions and results are part of every request. The server itself costs nothing to run. To plug the cinema server into VS Code or Claude Code, follow the stretch goals of [exercise 4.1](4-1-cinema-mcp-server.md#5-bonus-stretch-goals).

### Troubleshooting

| You see                                              | What to do                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 4-2, Step N`       | That function still calls `todo(...)`. Replace the whole line, then save.                                  |
| `Did you build the server? pnpm nx build cinema-mcp` | Build the server: `dist/main.js` is missing or outdated. `pnpm lab:check 4-2` builds it for you.           |
| `Connection closed` right after starting             | Run `node apps/cinema-mcp/dist/main.js` alone to see the server's startup error on stderr.                 |
| `search_movies failed: … expected string …`          | Pass arguments that match the schema, such as `{ query: 'fantasy' }`. The server returned `isError: true`. |
| `Unexpected token … in JSON`                         | Parse `block.text` / `content.text`, the JSON string inside the result.                                    |
| The script hangs and never exits                     | Close the client. `main()` closes it in `finally`; keep that if you change `main()`.                       |

Still stuck? `pnpm lab:solve 4-2` copies the reference solution into place and saves your version as `mcp-client.ts.mine`. `pnpm lab:reset 4-2` brings back the starter file.

> [!NOTE]
> `apps/cinema-mcp/src/server.test.ts` uses the same client code as an automated test. It connects twice, once with automatic protocol negotiation (`versionNegotiation: { mode: 'auto' }`) and once in legacy mode. `apps/cinema-mcp/src/main.ts` is the server side of the stdio transport, and shows why the server writes nothing to stdout.

## 6. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Call `client.listResourceTemplates()` and print the URI templates. With 4.1 done, read `cinema://movies/dream/captions` and print the first three cues with their timestamps.
- Call `readNotes(client, 'titanic')` in `main()`. `readResource` rejects, because the server answers with a "resource not found" error. Catch it and print the message.
- Call `search_movies` with `{ query: 42 }` and print the `isError` result instead of throwing. This is what a model would see.
- Pass `{ versionNegotiation: { mode: 'auto' } }` as the second argument of `new Client(...)` and compare the negotiated protocol version.
