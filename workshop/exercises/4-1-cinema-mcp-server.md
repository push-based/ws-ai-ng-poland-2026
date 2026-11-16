# Exercise 4.1: Exposing catalogue data from an MCP server

Extend the cinema's MCP server with a `get_movie` tool and a captions resource, then call both by hand in the MCP Inspector.

- **Terminal exercise** (http://127.0.0.1:4200/lab/4-1 lists the commands)
- **You edit:** `apps/cinema-mcp/src/tools/get-movie.ts`, `apps/cinema-mcp/src/resources/movie-captions.ts`
- **Check:** `pnpm lab:check 4-1`
- **Time:** ~20 min
- **Level:** core

You need neither the app nor Chrome. Build the server once:

```sh
pnpm nx build cinema-mcp
```

`apps/cinema-mcp` is a small MCP server with one tool, three resources and one prompt. It runs no model: the model lives in the host, the application that starts the server (an IDE, a chat app, an agent).

- A **tool** is a function the host's model decides to call.
- A **resource** is data with a URI that the application attaches to the model's context.

> **Warning:** Log with `console.error`. The protocol runs over stdout, so a `console.log` breaks the connection.

## 1. Register the `get_movie` tool

A model picks a tool by reading its description.

In `registerGetMovie()` in `get-movie.ts`, call `server.registerTool('get_movie', config, handler)`. The config has:

- a `title` and a `description` of one full sentence in plain language
- an `inputSchema`: a strict Zod object with `movieId: z.enum(['sintel', 'bunny', 'dream'])`
- `annotations: { readOnlyHint: true }`: a hint to the host that the tool only reads. It is not a permission system.

The handler returns a placeholder for now.

<details>
  <summary>Hint · skeleton: <code>registerGetMovie()</code></summary>

```ts
// apps/cinema-mcp/src/tools/get-movie.ts
export function registerGetMovie(server: McpServer): void {
  server.registerTool(
    'get_movie',
    {
      title: /* short name */,
      description: /* what it returns, for the model */,
      inputSchema: /* z.object({ movieId: … }).strict() */,
      annotations: /* read-only hint */,
    },
    async ({ movieId }) => {
      // Placeholder until Step 2.
      return { content: [{ type: 'text', text: `TODO ${movieId}` }] };
    },
  );
}
```

</details>

<details>
  <summary>Solution: get_movie metadata</summary>

```ts
// apps/cinema-mcp/src/tools/get-movie.ts
export function registerGetMovie(server: McpServer): void {
  server.registerTool(
    'get_movie',
    {
      title: 'Get one movie',
      description:
        'Return the catalogue facts of one film by its id: sintel, bunny or dream. Use search_movies first if you do not know the id.',
      // The SDK turns this Zod schema into the JSON Schema the host sees, and
      // validates every call against it before our handler runs.
      inputSchema: z
        .object({ movieId: z.enum(['sintel', 'bunny', 'dream']) })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    // …the placeholder handler from the skeleton follows here until Step 2.
```

</details>

### Try it

1. Run `pnpm lab:check 4-1`.
   - The Step 1 line turns ✔.

## 2. Return the film's facts

In the handler:

- Look the film up with `getMovie(movieId)`.
- Pick `id`, `title`, `year`, `director`, `genre`, `mood`, `description` and `license`.
- Add `notesUri: cinema://movies/<id>`, so the host can read the long notes when it needs them. A host with a cloud model pays tokens for every tool result, so short facts keep each call cheap.
- Return the object as `JSON.stringify` text.

A wrong id needs no code: `z.enum` rejects `titanic` before the handler runs.

<details>
  <summary>Solution: <code>registerGetMovie()</code></summary>

```ts
// apps/cinema-mcp/src/tools/get-movie.ts
export function registerGetMovie(server: McpServer): void {
  server.registerTool(
    'get_movie',
    {
      title: 'Get one movie',
      description:
        'Return the catalogue facts of one film by its id: sintel, bunny or dream. Use search_movies first if you do not know the id.',
      inputSchema: z
        .object({ movieId: z.enum(['sintel', 'bunny', 'dream']) })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ movieId }) => {
      const { id, title, year, director, genre, mood, description, license } =
        getMovie(movieId);
      const facts = {
        id,
        title,
        year,
        director,
        genre,
        mood,
        description,
        license,
        notesUri: `cinema://movies/${id}`,
      };
      return { content: [{ type: 'text', text: JSON.stringify(facts) }] };
    },
  );
}
```

</details>

### Try it

1. Run `pnpm lab:check 4-1` again.
   - Both Step 2 lines turn ✔.

## 3. Register the captions resource template

One registration covers a whole family of URIs: `cinema://movies/{movieId}/captions`.

In `registerCaptionResources()` in `movie-captions.ts`, create a `ResourceTemplate` for that URI and register it with `server.registerResource()` as `movie_captions`, with a `title`, a `description` and `mimeType: 'application/json'`.

> **Warning:** Pass `{ list: undefined }` as the second argument of `new ResourceTemplate(…)`.

<details>
  <summary>Hint · skeleton: <code>registerCaptionResources()</code></summary>

```ts
// apps/cinema-mcp/src/resources/movie-captions.ts
export function registerCaptionResources(server: McpServer): void {
  const template = new ResourceTemplate(/* the URI pattern */, {
    list: undefined,
  });
  server.registerResource(
    'movie_captions',
    template,
    {
      /* title, description, mimeType */
    },
    async (uri) => {
      // Placeholder until Step 4.
      return { contents: [{ uri: uri.href, text: '{}' }] };
    },
  );
}
```

</details>

<details>
  <summary>Solution: movie_captions template</summary>

```ts
// apps/cinema-mcp/src/resources/movie-captions.ts
export function registerCaptionResources(server: McpServer): void {
  // `list: undefined` = we do not enumerate every URI in resources/list.
  // Clients discover the pattern through resources/templates/list instead.
  const template = new ResourceTemplate('cinema://movies/{movieId}/captions', {
    list: undefined,
  });
  server.registerResource(
    'movie_captions',
    template,
    {
      title: 'Movie dialogue captions',
      description:
        'Timed dialogue cues of one film: start and end are seconds in the 30-second excerpt. Big Buck Bunny has no dialogue, so its list is empty.',
      mimeType: 'application/json',
    },
    // …the placeholder callback from the skeleton follows here until Step 4.
```

</details>

### Try it

1. Run `pnpm lab:check 4-1` again.
   - The Step 3 line turns ✔.

## 4. Read the captions

Nothing validates `movieId` here, so the callback checks it.

Replace the placeholder callback with `async (uri, { movieId }) => …`:

- Find the film in `movies`. Throw `new ResourceNotFoundError(uri.href)` for an unknown id.
- Return one content item with `uri: uri.href`, `mimeType: 'application/json'` and the JSON text `{ movieId, title, cues: movie.captions }`.

<details>
  <summary>Hint · skeleton: read callback</summary>

```ts
// apps/cinema-mcp/src/resources/movie-captions.ts
    async (uri, { movieId }) => {
      const id = /* movieId, or its first value when it is an array */;
      const movie = /* the film with that id in movies */;
      if (!movie) /* throw a ResourceNotFoundError */;
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: /* JSON with movieId, title and cues */,
          },
        ],
      };
    },
```

</details>

<details>
  <summary>Solution: <code>registerCaptionResources()</code></summary>

```ts
// apps/cinema-mcp/src/resources/movie-captions.ts
export function registerCaptionResources(server: McpServer): void {
  const template = new ResourceTemplate('cinema://movies/{movieId}/captions', {
    list: undefined,
  });
  server.registerResource(
    'movie_captions',
    template,
    {
      title: 'Movie dialogue captions',
      description:
        'Timed dialogue cues of one film: start and end are seconds in the 30-second excerpt. Big Buck Bunny has no dialogue, so its list is empty.',
      mimeType: 'application/json',
    },
    async (uri, { movieId }) => {
      // A URI-template variable can be a list; ours is always a single id.
      const id = Array.isArray(movieId) ? movieId[0] : movieId;
      const movie = movies.find((candidate) => candidate.id === id);
      if (!movie)
        throw new ResourceNotFoundError(uri.href, `Unknown movie: ${id}`);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              movieId: movie.id,
              title: movie.title,
              cues: movie.captions,
            }),
          },
        ],
      };
    },
  );
}
```

</details>

### Try it

1. Run `pnpm lab:check 4-1`.
   - It rebuilds the server, and all five lines turn ✔.
2. Start the MCP Inspector.
   - It runs no model, so you call everything by hand.

```sh
npx @modelcontextprotocol/inspector node apps/cinema-mcp/dist/main.js
```

1. Open the URL it prints and click **Connect**.
2. Under **Tools**, run `get_movie` with `dream`. The result names Bassam Kurdali as the director.
3. Under **Resources → Resource Templates**, open `movie_captions` and enter `sintel`. You get Sintel's timed cues.

---

## Check your work

```sh
pnpm lab:check 4-1
pnpm nx test cinema-mcp
```

All 5 checks should pass, and the server's own tests too.

Stuck?

- `pnpm lab:solve 4-1` puts the solution in place and keeps your files as `*.ts.mine`.
- `pnpm lab:reset 4-1` restores the starters.

| You see                                    | What to do                                                |
| ------------------------------------------ | --------------------------------------------------------- |
| `the server has no tool named "get_movie"` | Replace the Step 1 comment with your `registerTool` call. |
| `got "TODO sintel"`                        | Replace the placeholder handler with the Step 2 handler.  |
| `keep the three notes resources`           | Pass `{ list: undefined }` to `ResourceTemplate`.         |
| `Unexpected token` / "connection closed"   | Something wrote to stdout. Use `console.error`.           |
| The Inspector cannot find `dist/main.js`   | Run `pnpm nx build cinema-mcp`.                           |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** Compare with `apps/cinema-mcp/src/tools/search-movies.ts`, the existing tool.

## Bonus

- Connect a host that has a model. In VS Code, create `.vscode/mcp.json`, start the server and ask Copilot Chat in **Agent** mode: _"Who directed Elephants Dream? Use the cinema tools."_

  ```json
  {
    "servers": {
      "nano-cinema": {
        "type": "stdio",
        "command": "node",
        "args": ["${workspaceFolder}/apps/cinema-mcp/dist/main.js"]
      }
    }
  }
  ```

- In Claude Code: `claude mcp add nano-cinema -- node /absolute/path/to/ws-ai-ng-poland-2026/apps/cinema-mcp/dist/main.js`, then `/mcp`.
- Add a `complete` callback to the `ResourceTemplate`, so hosts can autocomplete `movieId`.
