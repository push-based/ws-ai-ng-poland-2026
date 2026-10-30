# Exercise 4.4: Imperative WebMCP

Not every feature is a form: a watchlist has "read", "add" and "remove". In this exercise we will register those three operations from JavaScript as WebMCP tools, each with a name, a description, a JSON input schema and an `execute()` function that runs in the page, with the page's live state. We validate every argument in code, and unregister all three tools with one signal.

**Page:** http://127.0.0.1:4200/lab/4-4 · **You edit:** `apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts` · **Check:** `pnpm lab:check 4-4` · **Time:** ~25 min · **Level:** core

## Goal

At the end of this exercise an agent call `add_to_watchlist {"movieId":"dream"}` runs your registered tool and puts _Elephants Dream_ on the page's watchlist, while `{"movieId":"titanic"}` is rejected with your own message.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/4-4 in Chrome. Look at the badge in section **A**:

- **Native WebMCP**: your Chrome exposes `document.modelContext` (`chrome://flags/#enable-webmcp-testing` is on). Keep the simulation switch off.
- **No WebMCP**: enable the flag and relaunch Chrome, or turn on **Use simulated browser AI** at the top. The badge then says **Simulated WebMCP**: a small stand-in that supports `registerTool`, `getTools` and `executeTool`.

Open `exercise.ts`. It already contains the types, a small `Watchlist` class, `movieIdSchema` and the helper `toolResult()`. You write the four functions that still call `todo('4-4', …)`. Exercise 4.5 imports this file, so keep it when you're done.

An MCP server tool (exercise 4.1) and a WebMCP tool look alike: name, description, schema, handler, result. The difference is where they run:

|                 | MCP server tool (4.1)                         | WebMCP tool (this exercise)                         |
| --------------- | --------------------------------------------- | --------------------------------------------------- |
| **Runs in**     | A separate process that a desktop host starts | The open web page                                   |
| **Offered via** | stdio, to the host's client                   | `document.modelContext`, to an agent in the browser |
| **Lifetime**    | As long as the server process runs            | Until the page goes away or you unregister it       |

## 1. Find WebMCP

Before the page can register anything, it needs the WebMCP entry point, and a clear `undefined` when the browser doesn't offer it.

In `getModelContext()`, read it from `document.modelContext`, and return `undefined` when it is missing. Check `typeof document === 'undefined'` first: like `typeof LanguageModel` in Block 2, it keeps the function safe where there is no `document` at all, such as Node (our checks) or a web worker.

<details>
  <summary>getModelContext() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts
export function getModelContext(): ModelContextLike | undefined {
  // `document` does not exist in Node (the checks) or in a web worker.
  if (typeof document === 'undefined') return undefined;
  return (document as Document & { modelContext?: ModelContextLike })
    .modelContext;
}
```

`document as Document & { modelContext?: … }` tells TypeScript about the new property, which the standard DOM types don't know yet.

</details>

Save and click **Register tools**. You get a 🧩 hint for Step 3, not Step 2: the page calls `watchlistTools()` next, and `readMovieId()` from Step 2 runs only inside the tools' `execute()`. Without WebMCP you get `document.modelContext is missing…` instead: turn on the simulation.

## 2. Validate arguments in code

The input schema tells an agent what to send. It is a contract, not validation: the browser doesn't promise to check arguments for you, and any caller (an agent with a mistake, a script, someone in DevTools) can send `{ "movieId": "titanic" }` or extra keys. So the handler checks every argument before it changes anything.

In `readMovieId()`, accept exactly `{ movieId }` and return the id. Throw an `Error` with a clear message when `args` is not a plain object (`null`, an array or a string), when it has any key other than `movieId` (the schema says `additionalProperties: false`), or when `movieId` is not a string from `movieIds`. The browser passes the message back to the agent as a failed tool call, so the agent can tell the user.

<details>
  <summary>readMovieId() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts
export function readMovieId(args: unknown): string {
  if (/* not a plain object */)
    throw new Error(/* show the expected shape */);
  const unexpected = /* every key other than movieId */;
  if (unexpected.length)
    throw new Error(/* name the unexpected keys */);
  const movieId = (args as Record<string, unknown>)['movieId'];
  if (/* not a string, or not in movieIds */)
    throw new Error(/* list the allowed ids */);
  return movieId;
}
```

</details>

<details>
  <summary>readMovieId() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts
export function readMovieId(args: unknown): string {
  if (!args || typeof args !== 'object' || Array.isArray(args))
    throw new Error(
      'Arguments must be an object like { "movieId": "sintel" }.',
    );
  const unexpected = Object.keys(args).filter((key) => key !== 'movieId');
  if (unexpected.length)
    throw new Error(`Unexpected argument: ${unexpected.join(', ')}.`);
  const movieId = (args as Record<string, unknown>)['movieId'];
  if (typeof movieId !== 'string' || !movieIds.includes(movieId))
    throw new Error(`movieId must be one of: ${movieIds.join(', ')}.`);
  return movieId;
}
```

</details>

Save and run `pnpm lab:check 4-4` in a second terminal. The `Step 2 · readMovieId() accepts exactly { movieId } with a real catalogue id` line turns ✔. The page uses this function from Step 3 onwards.

## 3. Describe the three tools

A tool is a plain object. The agent reads its name, description and schema to decide whether and how to call it, and the browser runs its `execute()`:

| Field         | Meaning                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | What the agent calls: `get_watchlist`, `add_to_watchlist`, `remove_from_watchlist`. Choose names that don't clash with other tools on the page. |
| `description` | How the agent decides _whether_ to use it. Say what it does and whether it changes anything.                                                    |
| `inputSchema` | JSON Schema of the arguments. `get_watchlist` takes none, so it is an empty object with `additionalProperties: false`.                          |
| `annotations` | `readOnlyHint: true` says "only reads, no side effects". Only `get_watchlist` may say that. It is a hint for the agent, not a permission.       |
| `execute`     | Runs when the agent calls the tool. It validates (Step 2), does the work through `Watchlist`, and returns `toolResult({...})`.                  |

In `watchlistTools()`, return the three tools. `get_watchlist` rejects any argument and returns the list. `add_to_watchlist` and `remove_from_watchlist` use the given `movieIdSchema`. Each tool returns the new state of the list with `toolResult({...})`, which wraps it as `{ content: [{ type: 'text', text: JSON.stringify(value) }] }`, so the agent can confirm what happened instead of guessing.

> [!WARNING]
> Call `readMovieId(args)` as the first line of `execute`, before `watchlist.add` or `watchlist.remove`. Then `titanic` is rejected before it can reach the list.

<details>
  <summary>watchlistTools() skeleton</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts
export function watchlistTools(watchlist: Watchlist): WatchlistTool[] {
  return [
    {
      name: 'get_watchlist',
      description: /* reads, changes nothing */,
      inputSchema: /* an object with no properties, no extra keys */,
      annotations: /* read-only */,
      execute: async (args) => {
        /* reject any argument */
        return toolResult({ watchlist: watchlist.list() });
      },
    },
    {
      name: 'add_to_watchlist',
      description: /* adds one film */,
      inputSchema: movieIdSchema,
      execute: async (args) => {
        /* validate, add, return { added, movieId, watchlist } */
      },
    },
    {
      name: 'remove_from_watchlist',
      /* like add_to_watchlist, with watchlist.remove() and `removed` */
    },
  ];
}
```

</details>

<details>
  <summary>watchlistTools() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts
export function watchlistTools(watchlist: Watchlist): WatchlistTool[] {
  return [
    {
      name: 'get_watchlist',
      description: "Read the films on the viewer's watchlist. Changes nothing.",
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        if (args && Object.keys(args).length)
          throw new Error('get_watchlist takes no arguments.');
        return toolResult({ watchlist: watchlist.list() });
      },
    },
    {
      name: 'add_to_watchlist',
      description: "Add one catalogue film to the viewer's watchlist.",
      inputSchema: movieIdSchema,
      execute: async (args) => {
        const movieId = readMovieId(args);
        const added = watchlist.add(movieId);
        return toolResult({ added, movieId, watchlist: watchlist.list() });
      },
    },
    {
      name: 'remove_from_watchlist',
      description: "Remove one film from the viewer's watchlist.",
      inputSchema: movieIdSchema,
      execute: async (args) => {
        const movieId = readMovieId(args);
        const removed = watchlist.remove(movieId);
        return toolResult({ removed, movieId, watchlist: watchlist.list() });
      },
    },
  ];
}
```

Why does `execute` ignore its second argument? The browser passes `{ signal }` there, an `AbortSignal` for cancelling long work. Our tools finish at once, so they don't need it.

</details>

Save and run `pnpm lab:check 4-4`. Both `Step 3` lines turn ✔: `watchlistTools() describes three tools with honest hints and schemas` and `execute() validates its own arguments and returns structured content`. On the page, **Register tools** now shows a 🧩 hint for Step 4.

## 4. Register with one signal, unregister by aborting it

`document.modelContext.registerTool(tool, { signal })` makes a tool discoverable. Unregistering works through the signal: when you call `controller.abort()`, the browser removes every tool that was registered with that signal. One controller per page or component gives you clean-up in one line, for example in `ngOnDestroy`.

In `registerAll()`, register every tool with `await context.registerTool(tool, { signal })`. Some Chrome builds return a promise from `registerTool`, so `await` it.

> [!WARNING]
> Abort the old controller before you register the same tools again: registering a name twice throws `A tool named "get_watchlist" is already registered`, for the first tool in your list. On this page, **Register tools** stays disabled until **Unregister (abort)** has released the first set.

<details>
  <summary>registerAll() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts
export async function registerAll(
  context: ModelContextLike,
  tools: WatchlistTool[],
  signal: AbortSignal,
): Promise<void> {
  for (const tool of tools) await context.registerTool(tool, { signal });
}
```

</details>

Save, let the page reload, and try it:

1. Click **Register tools**. The badge says **Registered**, and section **C** lists your three tools with their schemas.
2. In section **D**, click `add_to_watchlist {"movieId":"dream"}`. The browser runs your `execute()`. The result shows `"added": true`, and _Elephants Dream_ appears in section **B**.
3. Click `add_to_watchlist {"movieId":"titanic"}` and then the one with `"priority"`. Both are **Rejected** with your messages (`movieId must be one of: sintel, bunny, dream.` and `Unexpected argument: priority.`), and the watchlist does not change.
4. Use the **+ / −** buttons in section **B**. People and agents change the same list.
5. Click **Unregister (abort)**, then **Discover via browser**. Your tools are gone. Navigating to another page does the same, because `ngOnDestroy` aborts the controller.

Great job! In native mode, `getTools()` also lists the cinema's own six tools (`search_movies`, `set_audio_mix`, …), which the app registers at startup. Our names are different, so nothing clashes.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 4-4
```

Expected result:

```
  ✔ Step 1 · getModelContext() reads document.modelContext and is safe without a document
  ✔ Step 2 · readMovieId() accepts exactly { movieId } with a real catalogue id
  ✔ Step 3 · watchlistTools() describes three tools with honest hints and schemas
  ✔ Step 3 · execute() validates its own arguments and returns structured content
  ✔ Step 4 · registerAll() registers every tool with the signal; abort() unregisters them

  5 passed, 0 failed
```

The check runs your file in Node against the lab's simulated `document.modelContext`. It tests registration, validation and unregistering. It does not start a browser or an agent.

To call a tool from DevTools, register the tools, open DevTools → **Console** on the lab page and paste the snippet from section **E**. _Big Buck Bunny_ appears in the watchlist.

<details>
  <summary>DevTools snippet from section E</summary>

```js
// DevTools → Console on http://127.0.0.1:4200/lab/4-4
const tools = await document.modelContext.getTools();
console.table(tools.map(({ name, description }) => ({ name, description })));
const add = tools.find((tool) => tool.name === 'add_to_watchlist');
await document.modelContext.executeTool(add, { movieId: 'bunny' });
```

</details>

Older Chrome builds expected the arguments as a JSON string. The page's buttons retry with `JSON.stringify(args)` only after the known "Failed to parse input arguments" error, never after a handler error (see `core/webmcp/webmcp-client.ts`).

### Troubleshooting

| You see                                                   | What to do                                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 4-4, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                                       |
| `document.modelContext is missing…`                       | Turn on **Use simulated browser AI**, or enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome.                    |
| `A tool named "get_watchlist" is already registered`      | Pass `{ signal }` to `registerTool` (Step 4) so **Unregister (abort)** removes the tools. Reload the page, then register again. |
| `A tool needs name, description, inputSchema and execute` | Give each of the three objects all four fields; look for a typo such as `inputschema`.                                          |
| `titanic` is **added** to the list                        | Call `readMovieId(args)` at the start of `execute`, before `watchlist.add`.                                                     |
| Tools stay listed after leaving the page                  | Pass `{ signal }` to `registerTool` (Step 4), so aborting the controller removes them.                                          |
| `navigator.modelContext is undefined`                     | Read the API from `document.modelContext`.                                                                                      |

Still stuck? `pnpm lab:solve 4-4` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 4-4` brings back the starter file.

> [!NOTE]
> The cinema app registers its own tools the same way. `apps/movie-theater/src/app/core/webmcp/tools/catalogue.tools.ts` has three real tools with the same structure; `select_movie` validates `movieId` in its handler. `apps/movie-theater/src/app/core/webmcp/webmcp.service.ts` registers with one `AbortController`, unregisters through `DestroyRef`, and has one `invoke()` that rejects unknown keys and returns `{ content: [{ type: 'text', text }] }`. `apps/movie-theater/src/app/core/webmcp/webmcp-client.ts` holds the object-first, JSON-string-fallback rule for `executeTool()`. `validateAudioMix` in `libs/catalogue/src/audio-mix.ts` is domain validation shared by the human sliders and the agent tool.

## 5. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Add a `clear_watchlist` tool. It is destructive: think about its description, and leave out `readOnlyHint`.
- Add an optional `note` (string, max 80 characters) to `add_to_watchlist`. Update the schema and the validation, and test a 500-character note from DevTools.
- In `execute`, use the second argument `{ signal }`: add a fake 2-second delay and stop early when `signal.aborted`.
- Exercise 4.5 lets the on-device model choose and call these tools. Keep your file: the 4.5 page imports it.
