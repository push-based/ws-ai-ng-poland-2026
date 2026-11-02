# Exercise 4.1: Exposing catalogue data from an MCP server

A model only knows its training data and its context, so it can invent a film that isn't in our catalogue. In this exercise we will extend the cinema's MCP server so that any MCP host can look up a film's facts with a `get_movie` tool and read its dialogue captions from a resource template. Then you call both by hand in the MCP Inspector.

**Terminal exercise** (http://127.0.0.1:4200/lab/4-1 lists the commands) · **You edit:** `apps/cinema-mcp/src/tools/get-movie.ts`, `apps/cinema-mcp/src/resources/movie-captions.ts` · **Check:** `pnpm lab:check 4-1` · **Time:** ~20 min · **Level:** core

## Goal

At the end of this exercise the MCP Inspector, connected to the cinema server, gets Elephants Dream's facts (directed by Bassam Kurdali) from `get_movie("dream")` and Sintel's timed dialogue cues from `cinema://movies/sintel/captions`.

## 0. Setup

Do the one-time setup from the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop). This exercise runs in the terminal: you need neither `pnpm start` nor Chrome for it. Build the server once and run the check. It fails, and that's expected:

```sh
pnpm nx build cinema-mcp
pnpm lab:check 4-1
```

You see `🧩 Step 1 (registerGetMovie) is not done yet: the server has no tool named "get_movie".`

The repository already contains a small MCP server in `apps/cinema-mcp`: a Node program that offers the catalogue to AI applications. It has one tool (`search_movies`), three resources (`cinema://movies/sintel`, …) and one prompt. `apps/cinema-mcp/src/server.ts` already calls `registerGetMovie(server)` and `registerCaptionResources(server)` after them. Both functions contain only `// TODO Step n` comments, so the server still starts while you work.

| Term                  | Meaning                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **MCP server**        | Offers tools, resources and prompts over the Model Context Protocol. It runs no model.                                             |
| **Host**              | The application with the model and the user: an IDE, a chat app, an agent. It starts the server and talks to it over stdin/stdout. |
| **Tool**              | A function with a name, a description and an input schema. The host's model decides to call it, and your code returns real data.   |
| **Resource**          | Data with a URI, such as `cinema://movies/sintel`. The application or the user picks it and attaches it to the model's context.    |
| **Resource template** | One registration for a whole family of resource URIs, such as `cinema://movies/{movieId}/captions`.                                |

> [!WARNING]
> Log with `console.error`. The host and the server talk JSON-RPC over stdout, so any other text written there breaks the connection.

## 1. Register the `get_movie` tool

A host's model picks a tool by reading its metadata, and the SDK checks every call against the tool's schema before your code runs. So we start with the metadata.

In `registerGetMovie()` in `get-movie.ts`, call `server.registerTool('get_movie', config, handler)`. In `config`, give it:

- a `title` and a `description` in plain language. The description matters most: a model picks tools by reading it.
- an `inputSchema`: a Zod object with one `movieId` field, `z.enum(['sintel', 'bunny', 'dream'])`, and `.strict()` so that extra keys are rejected.
- `annotations: { readOnlyHint: true }`: a hint to the host that this tool only reads data. It is not a permission system.

For now the handler returns a placeholder. Step 2 makes it real.

<details>
  <summary>registerGetMovie() skeleton</summary>

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
  <summary>get_movie metadata solution</summary>

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

| Code                                   | Meaning                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `'get_movie'`                          | The tool name the model uses. Short, lowercase, verb first.                                              |
| `z.enum(['sintel', 'bunny', 'dream'])` | The only accepted values. The host shows them to the model as an `enum` in JSON Schema.                  |
| `.strict()`                            | `{ movieId: 'dream', plot: '…' }` is rejected instead of silently ignored.                               |
| `async ({ movieId }) => …`             | The handler. It receives arguments that already passed validation, so `movieId` is one of the three ids. |
| `{ content: [{ type: 'text', … }] }`   | The MCP tool result: a list of content blocks. Text is the most common one.                              |

</details>

Save and run `pnpm lab:check 4-1` (it rebuilds the server first). The `Step 1 · get_movie is listed with a strict movieId enum and readOnlyHint` line turns ✔. Both `Step 2` lines still fail, because the handler returns `TODO sintel` instead of JSON.

## 2. Return the film's facts

The handler does the real work, with deterministic code and no model involved. We return only the short facts: the long programme notes are already a resource (`cinema://movies/<id>`), so we hand the host their URI as `notesUri`, and it reads them only when it needs them. You will compare the size of the two in Step 4.

In the handler, look the film up with `getMovie(movieId)`, pick `id`, `title`, `year`, `director`, `genre`, `mood`, `description` and `license`, add `notesUri: cinema://movies/<id>`, and return the object as `JSON.stringify` text.

<details>
  <summary>registerGetMovie() solution</summary>

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

You write no code for a wrong id. `z.enum` rejects `titanic` before the handler runs, and the client receives a result with `isError: true` and a validation message, which a model can read and correct itself from.

Save and run `pnpm lab:check 4-1`. Both `Step 2` lines turn ✔: `get_movie returns the real catalogue facts as JSON text` and `get_movie rejects an id that is not in the catalogue`. Steps 3 and 4 fail with `🧩 Step 3 (registerCaptionResources) is not done yet`.

## 3. Register the captions resource template

Captions are content a host attaches to the model's context, so they belong in a resource, not in a tool the model has to decide to call. The server registers its three notes resources one by one. For captions we write one registration for a whole family of URIs instead: `cinema://movies/{movieId}/captions`, where `{movieId}` is a variable (RFC 6570 URI template syntax). A client discovers the template with `resources/templates/list`, fills in the variable and reads, for example, `cinema://movies/dream/captions`.

In `registerCaptionResources()` in `movie-captions.ts`, create a `ResourceTemplate` for that URI and register it with `server.registerResource()` under the name `movie_captions`, with a `title`, a `description` and `mimeType: 'application/json'`. The read callback returns a placeholder for now.

> [!WARNING]
> Pass `{ list: undefined }` as the second argument of `new ResourceTemplate(…)`. The SDK requires the `list` option, and `undefined` keeps every caption URI out of `resources/list`, so that list still holds the three notes resources.

<details>
  <summary>registerCaptionResources() skeleton</summary>

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
  <summary>movie_captions template solution</summary>

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

Save and run `pnpm lab:check 4-1`. The `Step 3 · the captions resource template is listed (and not as a fixed resource)` line turns ✔. Step 4 fails with `return the cues as { cues: movie.captions }`.

## 4. Read the captions

The read callback receives the requested `uri` and the template variables, for example `{ movieId: 'dream' }`. Nothing validated `movieId` this time: any text matches `{movieId}`, so the callback checks it.

Replace the placeholder callback with `async (uri, { movieId }) => …`. Find the film in `movies`, and return one content item with `uri: uri.href`, `mimeType: 'application/json'` and the JSON text `{ movieId, title, cues: movie.captions }`. Big Buck Bunny has no dialogue: its `cues` list is empty, and that is a valid answer.

> [!WARNING]
> Throw `ResourceNotFoundError` for an id that is not in the catalogue. The SDK turns it into a protocol error that the client receives. In the SDK's types a variable can also be a `string[]` (URI templates can expand lists), so take the first value when it is an array.

<details>
  <summary>read callback skeleton</summary>

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
  <summary>registerCaptionResources() solution</summary>

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

Each cue looks like the first cue of Elephants Dream, `{ "start": 2.037, "end": 3.494, "text": "Are you hurt?" }`: seconds in the 30-second clip plus the spoken line. These are real, sourced subtitles, not generated text.

</details>

Save and run `pnpm lab:check 4-1`. All five lines turn ✔ (see [Check your work](#check-your-work)).

Now see it from a host. `pnpm lab:check 4-1` has already rebuilt `apps/cinema-mcp/dist/main.js`. Start the MCP Inspector, the official debugging UI. It runs no model, so you call everything by hand and no tokens are used. The first run downloads it with `npx`, so it needs network access:

```sh
npx @modelcontextprotocol/inspector node apps/cinema-mcp/dist/main.js
```

1. Open the local URL it prints and click **Connect**.
2. Under **Tools**, choose `get_movie`, enter `dream` and run it. The result names Bassam Kurdali as the director.
3. Under **Resources → Resource Templates**, open `movie_captions` and enter `sintel`. You get Sintel's timed cues.
4. Run `get_movie` with `sintel`, then read the fixed resource `cinema://movies/sintel` under **Resources**. Count the top-level fields in each JSON text:

> `get_movie("sintel")` → \_\_\_ fields · `cinema://movies/sintel` → \_\_\_ fields, including every `notes` paragraph and every caption cue

A host that has a cloud model pays tokens for every tool result it passes on, so the short facts keep each call cheap, and the long notes are read only when the model needs them.

Well done! Your server now answers a real host.

## Check your work

Run:

```sh
pnpm lab:check 4-1
```

It rebuilds the server, starts `apps/cinema-mcp/dist/main.js` and talks to it over stdio like a real host. Expected result:

```
  ✔ Step 1 · get_movie is listed with a strict movieId enum and readOnlyHint
  ✔ Step 2 · get_movie returns the real catalogue facts as JSON text
  ✔ Step 2 · get_movie rejects an id that is not in the catalogue
  ✔ Step 3 · the captions resource template is listed (and not as a fixed resource)
  ✔ Step 4 · reading cinema://movies/<id>/captions returns timed cues; unknown ids fail

  5 passed, 0 failed
```

Also run the server's own tests. They still pass, because `search_movies` is still the first tool and there are still three listed resources:

```sh
pnpm nx test cinema-mcp
```

### Troubleshooting

| You see                                                 | What to do                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 🧩 `the server has no tool named "get_movie"`           | Replace the Step 1 comment with your `registerTool` call and save. `pnpm lab:check 4-1` rebuilds for you.     |
| `The build failed. Read the TypeScript error above`     | Fix the typo the error names, for example a missing `)` or a misspelt import. It gives the file and the line. |
| `got "TODO sintel"`                                     | Replace the placeholder handler from Step 1 with the Step 2 handler.                                          |
| `a movieId field: z.object({ movieId: … })` fails       | Spell the field `movieId`, with a capital I.                                                                  |
| `keep the three notes resources`                        | Pass `{ list: undefined }` to `ResourceTemplate`, so the caption URIs stay out of `resources/list`.           |
| `Unexpected token` / the host shows "connection closed" | Log with `console.error`: something wrote to stdout, for example a `console.log`.                             |
| The Inspector or a host cannot find `dist/main.js`      | Run `pnpm nx build cinema-mcp`. Hosts need the absolute path (VS Code fills in `${workspaceFolder}` for you). |

Still stuck? `pnpm lab:solve 4-1` copies the reference solution into place and saves your files as `*.ts.mine`. `pnpm lab:reset 4-1` brings back the starter files.

> [!NOTE]
> Compare with the rest of the server. `apps/cinema-mcp/src/tools/search-movies.ts` is the existing tool, with the same pattern plus an optional argument and a default. `apps/cinema-mcp/src/resources/movie-notes.ts` registers three fixed resources, one per film: compare it with your template. `apps/cinema-mcp/src/prompts/film-club.ts` is the third MCP capability, a prompt: reusable messages, no model call. `apps/cinema-mcp/src/server.test.ts` starts the built server and talks to it with the real client. Exercise 4.2 builds such a client.

## 5. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Connect a host that has a model. The server runs no model: the model lives in the host, and if it is a cloud model, every tool description, call and result costs tokens on the host's bill. Start the compiled file `apps/cinema-mcp/dist/main.js` with `node` as the host command: Nx prints its own text on stdout, which breaks the protocol.
  - **VS Code.** Create `.vscode/mcp.json` in the repository:

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

    Click the **Start** action above the server entry, open Copilot Chat in **Agent** mode, check that the nano-cinema tools are enabled in the tools picker, and ask: _"Who directed Elephants Dream? Use the cinema tools."_ The menus change between VS Code versions; search the Command Palette for "MCP" if yours look different.

  - **Claude Code.** Register the server with its absolute path, start `claude`, type `/mcp` to see that `nano-cinema` is connected, and ask the same question. Claude Code asks for permission before it calls a tool.

    ```sh
    claude mcp add nano-cinema -- node /absolute/path/to/ws-ai-ng-poland-2026/apps/cinema-mcp/dist/main.js
    ```

- Give `get_movie` an `outputSchema` and return `structuredContent: facts` next to the text block, so a host can read typed data. Look at the `registerTool` example in the SDK's type definitions.
- Add a `complete` callback to the `ResourceTemplate` so hosts can autocomplete `movieId` (`complete: { movieId: () => ['sintel', 'bunny', 'dream'] }`).
- Add a `lang` variable: `cinema://movies/{movieId}/captions/{lang}`, which returns `en` only and rejects other languages for now.
