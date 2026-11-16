# Exercise 4.5 (bonus): A local agent at zero token cost

Build a small agent that runs on the device. The Prompt API picks a tool and fills in its arguments. Your code checks the proposal and executes one tool, once.

- **Page:** http://127.0.0.1:4200/lab/4-5
- **You edit:** `apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts`
- **Check:** `pnpm lab:check 4-5`
- **Time:** ~25 min
- **Level:** bonus

> **Warning:** Finish exercise 4.4 first, or run `pnpm lab:solve 4-4`. This page uses your 4.4 tools.

> **Tip:** Native mode needs the Prompt API and WebMCP. Otherwise turn on **Use simulated browser AI**: it picks a tool whose name appears in your words, so use the suggestion buttons. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

Click **Prepare the agent** on the page. `describeTools()`, `parseSchema()` and `createAgentSession()` are given. You write four functions.

## 1. Describe the decision as a schema

The model answers with one JSON object: `{ "tool": "<name>" }`.

In `choiceSchema()`, return an object schema with one required string field `tool`. Its `enum` holds `'none'` plus the name of every offered tool. `'none'` is for requests that need no action.

<details>
  <summary>Solution: <code>choiceSchema()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts
export function choiceSchema(
  tools: readonly DiscoveredTool[],
): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      tool: {
        type: 'string',
        enum: ['none', ...tools.map((tool) => tool.name)],
      },
    },
    required: ['tool'],
    additionalProperties: false,
  };
}
```

</details>

## 2. Let the model choose

Every decision runs in a fresh copy of the base session, so earlier requests cannot leak in.

In `chooseTool()`:

- Clone `base`. Pass `{ signal }` to `clone()`, `append()` and `prompt()`.
- `append()` the tool menu (`describeTools(tools)`) as a user message.
- `prompt(request)` with `choiceSchema(tools)` as the `responseConstraint`.
- Parse the `tool` field. Throw an `Error` when it is neither `'none'` nor an offered name.
- Destroy the clone in `finally`. Leave the base session alive.

<details>
  <summary>Hint · skeleton: <code>chooseTool()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts
export async function chooseTool(
  base: LanguageModel,
  request: string,
  tools: readonly DiscoveredTool[],
  signal?: AbortSignal,
): Promise<string> {
  const session = /* a fresh clone of base */;
  try {
    /* 1. append the tool menu as a user message */
    const answer = /* 2. prompt with the request and choiceSchema(tools) */;
    const { tool } = JSON.parse(answer) as { tool?: unknown };
    /* 3. throw unless tool is 'none' or an offered name */
    return tool as string;
  } finally {
    /* release the clone */
  }
}
```

</details>

<details>
  <summary>Solution: <code>chooseTool()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts
export async function chooseTool(
  base: LanguageModel,
  request: string,
  tools: readonly DiscoveredTool[],
  signal?: AbortSignal,
): Promise<string> {
  const session = await base.clone({ signal });
  try {
    await session.append([{ role: 'user', content: describeTools(tools) }], {
      signal,
    });
    const answer = await session.prompt(request, {
      responseConstraint: choiceSchema(tools),
      signal,
    });
    const { tool } = JSON.parse(answer) as { tool?: unknown };
    // Structured output gives the right SHAPE. Still check the value in code.
    if (tool !== 'none' && !tools.some((candidate) => candidate.name === tool))
      throw new Error(
        `The model chose a tool that is not offered: ${String(tool)}`,
      );
    return tool as string;
  } finally {
    session.destroy();
  }
}
```

</details>

## 3. Let the model fill in the arguments

Now the tool's own `inputSchema` is the `responseConstraint`, so the model cannot write `titanic`.

In `extractArguments()`:

- Read the schema with `parseSchema(tool.inputSchema)`.
- When it has no properties, return `{}` without a model call.
- Otherwise clone `base`, append a message that names the tool, and prompt with the schema as the `responseConstraint`. Pass `{ signal }` to every call.
- Return the parsed object. Throw an `Error` when it is not a plain object (`null` or an array).
- Destroy the clone in `finally`.

<details>
  <summary>Hint · skeleton: <code>extractArguments()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts
export async function extractArguments(
  base: LanguageModel,
  request: string,
  tool: DiscoveredTool,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const schema = parseSchema(tool.inputSchema);
  if (/* the schema has no properties */) return {};
  const session = /* a fresh clone of base */;
  try {
    /* append: which tool, what it does, use only values from the request */
    const answer = /* prompt with the request, the schema as responseConstraint */;
    const args = JSON.parse(answer) as unknown;
    if (/* not a plain object */)
      throw new Error(/* say the model returned no arguments object */);
    return args as Record<string, unknown>;
  } finally {
    /* release the clone */
  }
}
```

</details>

<details>
  <summary>Solution: <code>extractArguments()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts
export async function extractArguments(
  base: LanguageModel,
  request: string,
  tool: DiscoveredTool,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const schema = parseSchema(tool.inputSchema);
  // A tool without parameters (get_watchlist) needs no model call at all.
  if (!Object.keys((schema['properties'] as object | undefined) ?? {}).length)
    return {};
  const session = await base.clone({ signal });
  try {
    await session.append(
      [
        {
          role: 'user',
          content: `Fill in the arguments of the tool "${tool.name}" (${tool.description ?? ''}). Use only values from the request.`,
        },
      ],
      { signal },
    );
    const answer = await session.prompt(request, {
      responseConstraint: schema,
      signal,
    });
    const args = JSON.parse(answer) as unknown;
    if (!args || typeof args !== 'object' || Array.isArray(args))
      throw new Error('The model did not return an arguments object.');
    return args as Record<string, unknown>;
  } finally {
    session.destroy();
  }
}
```

</details>

## 4. One run: discover, choose, extract, execute once

In `runAgent()`:

- Call `signal?.throwIfAborted()`.
- Filter `await context.getTools()` by `allowed`. Throw when no tool is left.
- Choose with `chooseTool()`. On `'none'`, return `{ tool: 'none', args: {}, result: null }`.
- Extract the arguments with `extractArguments()`.
- Call `signal?.throwIfAborted()` again, then execute once with `executeDiscoveredTool(context, tool, args)`. Take the `result` field of what it returns, and return `{ tool: tool.name, args, result }`.

There is no loop: one request, one action. Your 4.4 `execute()` validates the arguments again.

<details>
  <summary>Hint · skeleton: <code>runAgent()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts
export async function runAgent(
  request: string,
  context: AgentContext,
  base: LanguageModel,
  signal?: AbortSignal,
  allowed: readonly string[] = watchlistToolNames,
): Promise<AgentRun> {
  signal?.throwIfAborted();
  const tools = /* getTools(), only the names in allowed */;
  if (!tools.length) throw new Error(/* no watchlist tools yet */);
  const choice = /* Step 2 */;
  if (choice === 'none') return { tool: 'none', args: {}, result: null };
  const tool = /* the offered tool with that name */;
  if (!tool) throw new Error(/* unknown tool */);
  const args = /* Step 3 */;
  signal?.throwIfAborted();
  const { result } = /* execute once through the browser */;
  return { tool: tool.name, args, result };
}
```

</details>

<details>
  <summary>Solution: <code>runAgent()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts
export async function runAgent(
  request: string,
  context: AgentContext,
  base: LanguageModel,
  signal?: AbortSignal,
  allowed: readonly string[] = watchlistToolNames,
): Promise<AgentRun> {
  signal?.throwIfAborted();
  // Least privilege: offer the model only this page's tools.
  const tools = (await context.getTools()).filter((tool) =>
    allowed.includes(tool.name),
  );
  if (!tools.length) throw new Error('No watchlist tools are registered yet.');
  const choice = await chooseTool(base, request, tools, signal);
  if (choice === 'none') return { tool: 'none', args: {}, result: null };
  const tool = tools.find((candidate) => candidate.name === choice);
  if (!tool) throw new Error(`Unknown tool: ${choice}`);
  const args = await extractArguments(base, request, tool, signal);
  signal?.throwIfAborted();
  // Execute exactly once. The tool's execute() validates args (exercise 4.4).
  const { result } = await executeDiscoveredTool(context, tool, args);
  return { tool: tool.name, args, result };
}
```

</details>

### Try it

Click each suggestion, then **Run agent**. The simulation gives:

| Request                                            | Tool                     | Watchlist after the run |
| -------------------------------------------------- | ------------------------ | ----------------------- |
| Add to watchlist: Sintel                           | `add_to_watchlist`       | Sintel                  |
| Add to watchlist: Elephants Dream                  | `add_to_watchlist`       | Sintel, Elephants Dream |
| Get watchlist                                      | `get_watchlist`          | Sintel, Elephants Dream |
| Remove from watchlist: Sintel                      | `remove_from_watchlist`  | Elephants Dream         |
| What does a bass filter do?                        | `none`                   | nothing executed        |
| Could you put the bunny film on my list for later? | `none` in the simulation | nothing executed        |

Open DevTools → **Network** and run once more: no request goes to a model API. The cost is the model download, memory and time. A small local model is less capable than a cloud model, so keep its job narrow and keep the validation in code.

---

## Check your work

```sh
pnpm lab:check 4-5
```

All 5 checks should pass.

Stuck?

- `pnpm lab:solve 4-5` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 4-5` restores the starter.

| You see                                             | What to do                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| **Needs 4.4** after **Prepare**                     | Finish your 4.4 file, or run `pnpm lab:solve 4-4`.                     |
| `Unexpected token … is not valid JSON`              | Pass `responseConstraint` to `prompt()` in Steps 2 and 3.              |
| The simulation always answers `none`                | Use the tool's words in the request, such as "add to watchlist".       |
| An error from your 4.4 `readMovieId()`              | Your 4.4 handler rejected the model's arguments. Rephrase the request. |
| `InvalidStateError: The session has been destroyed` | Destroy the clone, not the base session.                               |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: **/preflight → Run local agent evaluations** is a bigger version (`features/evaluation/evaluation.agent.ts`).

## Bonus

- After the action, let one more fresh clone turn `run.result` into a friendly sentence.
- Support two actions: ask for a plan, validate every step first, then execute in order.
