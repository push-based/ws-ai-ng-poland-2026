# Exercise 4.4: Imperative WebMCP

Not every feature is a form. Register a watchlist's "read", "add" and "remove" from JavaScript as WebMCP tools, validate every argument, and unregister them with one signal.

- **Page:** http://127.0.0.1:4200/lab/4-4
- **You edit:** `apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts`
- **Check:** `pnpm lab:check 4-4`
- **Time:** ~25 min
- **Level:** core

> **Tip:** The badge in section **A** says **No WebMCP**? Enable `chrome://flags/#enable-webmcp-testing` and relaunch Chrome, or turn on **Use simulated browser AI**. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

The `Watchlist` class, `movieIdSchema` and `toolResult()` are given. You write four functions. Exercise 4.5 imports this file, so keep it.

## 1. Find WebMCP

In `getModelContext()`, return `document.modelContext`, or `undefined` when it is missing. TypeScript needs a cast: `(document as Document & { modelContext?: ModelContextLike }).modelContext`. Check `typeof document === 'undefined'` first, so the function also works in Node.

<details>
  <summary>Solution: <code>getModelContext()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-4-imperative-webmcp/exercise.ts
export function getModelContext(): ModelContextLike | undefined {
  // `document` does not exist in Node (the checks) or in a web worker.
  if (typeof document === 'undefined') return undefined;
  return (document as Document & { modelContext?: ModelContextLike })
    .modelContext;
}
```

</details>

## 2. Validate arguments in code

The input schema tells an agent what to send. It does not check anything, and any caller can send `{ "movieId": "titanic" }`.

In `readMovieId()`, return the id from `{ movieId }`. Throw an `Error` with a clear message when:

- `args` is not a plain object
- it has any key other than `movieId`
- `movieId` is not a string from `movieIds`

<details>
  <summary>Hint · skeleton: <code>readMovieId()</code></summary>

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
  <summary>Solution: <code>readMovieId()</code></summary>

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

## 3. Describe the three tools

A tool is a plain object:

| Field         | Meaning                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `name`        | What the agent calls                                                      |
| `description` | One full sentence. The agent decides with it whether to use the tool      |
| `inputSchema` | JSON Schema of the arguments                                              |
| `annotations` | `readOnlyHint: true` for a tool that only reads. A hint, not a permission |
| `execute`     | Runs in the page when the agent calls the tool                            |

In `watchlistTools()`, return three tools:

- `get_watchlist`: takes no arguments, so its `execute` throws an `Error` when any key is passed. Read-only, returns the list.
- `add_to_watchlist` and `remove_from_watchlist`: use `movieIdSchema`.

Each `execute` returns the new state with `toolResult({...})`.

> **Warning:** Call `readMovieId(args)` as the first line of `execute`, before the list changes.

<details>
  <summary>Hint · skeleton: <code>watchlistTools()</code></summary>

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
  <summary>Solution: <code>watchlistTools()</code></summary>

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

</details>

## 4. Register with one signal

When you abort the signal, the browser removes every tool registered with it.

In `registerAll()`, register every tool with `await context.registerTool(tool, { signal })`.

<details>
  <summary>Solution: <code>registerAll()</code></summary>

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

### Try it

1. Click **Register tools**.
   - Section **C** lists your three tools.
2. In section **D**, click `add_to_watchlist {"movieId":"dream"}`.
   - _Elephants Dream_ appears in section **B**.
3. Click the `titanic` request and the one with `"priority"`.
   - Both are **Rejected** with your messages.
4. Click **Unregister (abort)**, then **Discover via browser**.
   - Your tools are gone.

---

## Check your work

```sh
pnpm lab:check 4-4
```

All 5 checks should pass.

Stuck?

- `pnpm lab:solve 4-4` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 4-4` restores the starter.

| You see                                                             | What to do                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `A tool named "get_watchlist" is already registered`                | Pass `{ signal }` to `registerTool`, reload the page, register again.  |
| `A tool needs name, description, inputSchema and execute`           | Give each tool all four fields. Look for a typo such as `inputschema`. |
| `titanic` is **added** to the list                                  | Call `readMovieId(args)` at the start of `execute`.                    |
| `document.modelContext is missing…` although the badge shows WebMCP | Read the API from `document.modelContext`.                             |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `core/webmcp/tools/catalogue.tools.ts` has three real tools with the same structure.

## Bonus

- Add a `clear_watchlist` tool. It is destructive, so leave out `readOnlyHint`.
- Call a tool from DevTools with the snippet in section **E**.
