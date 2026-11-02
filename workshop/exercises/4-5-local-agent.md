# Exercise 4.5 (bonus): A local agent at zero token cost

An agent is a model that can act: it reads a request, picks a tool, fills in the arguments, and the application runs the tool. In this exercise we will build a small one entirely on the device: the on-device Prompt API with structured output (exercise 2.3) decides, and your watchlist tools from exercise 4.4 act through WebMCP's `getTools()` and `executeTool()`. The model only proposes; your code checks the proposal and executes one tool once, and the tool's own handler validates the arguments again.

**Page:** http://127.0.0.1:4200/lab/4-5 · **You edit:** `apps/movie-theater/src/app/lab/exercises/4-5-local-agent/exercise.ts` · **Check:** `pnpm lab:check 4-5` · **Time:** ~25 min · **Level:** bonus

> [!NOTE]
> This whole exercise is a bonus. You don't need to complete it.

## Goal

At the end of this exercise **Run agent** turns "Add to watchlist: Sintel" into one `add_to_watchlist` call that puts Sintel on the watchlist in section **C**, with no request leaving the browser for a model API.

## 0. Setup

> [!WARNING]
> Finish exercise 4.4 first, or run `pnpm lab:solve 4-4`. This page registers your tools from `4-4-imperative-webmcp/exercise.ts`, and shows **Needs 4.4** while that file still has a `todo()`.

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/4-5 in Chrome. Choose a mode:

- **Native**: you need both the Prompt API (see `/preflight`) and WebMCP (`chrome://flags/#enable-webmcp-testing`). Keep the simulation switch off.
- **Simulated**: turn on **Use simulated browser AI**. The simulated "model" does not understand language: it picks a tool whose name appears in your words ("add to watchlist") and a film whose id or title appears. That is enough to test your code's logic, and the suggestion buttons are worded for it.

Click **Prepare the agent**. The badges show **Tools registered** and **Session ready**. This uses the given `createAgentSession()`, the routine from exercise 2.1.

Open `exercise.ts`. `describeTools()`, `parseSchema()`, `createAgentSession()` and the types are given. You write the four functions that still call `todo('4-5', …)`.

## 1. Describe the decision as a schema

We don't let the model write free text such as "I think you want to add Sintel". We ask for one JSON object, `{ "tool": "<name>" }`, and a `responseConstraint` (JSON Schema) makes the model's output follow that shape (constrained decoding).

In `choiceSchema()`, return an object schema with one required string field, `tool`, whose `enum` holds `'none'` plus the name of every offered tool, and no other properties. `'none'` is the answer for requests that need no action, such as a question.

<details>
  <summary>choiceSchema() solution</summary>

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

Save and run `pnpm lab:check 4-5` in a second terminal. The `Step 1 · choiceSchema() allows exactly "none" and the offered tool names` line turns ✔. On the page, **Run agent** still shows a 🧩 hint for Step 4: `runAgent()` is the entry point, so it is the first function the page calls, and the page needs all four steps.

## 2. Let the model choose, in a fresh clone

Three habits from Block 2 make the decision reliable:

1. A fresh context for every decision. `base.clone()` copies the base session, which holds only the system prompt. Earlier requests cannot leak into this decision, and the base stays small.
2. The tool menu as context, the request as the prompt. `append()` adds the menu (`describeTools(tools)`: one line per tool with its description) to the clone without generating an answer. Then `prompt(request, { responseConstraint })` asks for the decision.
3. Check the value in code. Structured output guarantees the shape. Your code still checks the value: only `'none'` or an offered name is accepted.

In `chooseTool()`, clone `base`, append the menu as a user message, prompt with `choiceSchema(tools)` as the `responseConstraint`, parse the `tool` field and return it. Throw an `Error` when it is neither `'none'` nor an offered name. Pass `signal` to every call.

> [!WARNING]
> Call `destroy()` on the clone, in `finally`, so it is released even when something throws. Destroying the base session instead ends every later run with `InvalidStateError: The session has been destroyed`.

<details>
  <summary>chooseTool() skeleton</summary>

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
  <summary>chooseTool() solution</summary>

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

Run `pnpm lab:check 4-5` again: `Step 2 · chooseTool() decides in a fresh clone with responseConstraint and destroys it` turns ✔. The check also confirms that the base session's token count did not change.

## 3. Let the model fill in the arguments

Now the model gets only the chosen tool, and the tool's own `inputSchema` becomes the `responseConstraint`. For `add_to_watchlist` that schema allows `movieId` to be only `sintel`, `bunny` or `dream`, so the model cannot write `titanic`. This is progressive disclosure: the model sees the argument contract of one tool, not of all of them, so its job is smaller.

In `extractArguments()`, read the schema with the given `parseSchema(tool.inputSchema)` (`getTools()` may return it as a JSON string). When it has no properties, as for `get_watchlist`, return `{}` without a model call: that saves one prompt, 250 ms in the simulation. Otherwise clone `base`, append one user message that names the tool and its description and asks for values from the request only, prompt with the schema as the `responseConstraint`, and return the parsed object. Throw an `Error` when the answer is not a plain object, and destroy the clone in `finally`.

<details>
  <summary>extractArguments() skeleton</summary>

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
  <summary>extractArguments() solution</summary>

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

Run `pnpm lab:check 4-5` again: `Step 3 · extractArguments() uses the tool schema as responseConstraint in a fresh clone` turns ✔.

## 4. One run: discover, choose, extract, execute once

`runAgent()` connects everything, and the application stays in charge of what happens:

- Least privilege. `getTools()` lists every tool on the page; in native mode that includes the cinema's own six tools. We offer the model only the names in `allowed`, which defaults to `watchlistToolNames`.
- `'none'` stops. A question such as "What does a bass filter do?" changes nothing, so nothing is executed.
- Execute once. We don't loop, and we don't ask the model "anything else?" afterwards: the request is fulfilled when the one action is done. That rule prevents runaway agents and duplicate side effects.
- Through the browser. `executeDiscoveredTool()` (from the reference app, already imported) calls `context.executeTool()` with object arguments, and retries with a JSON string only after the known parser error of older Chrome builds. Your 4.4 `execute()` then validates the arguments again, so the model's proposal is never trusted on its own.

In `runAgent(request, context, base, signal?, allowed = watchlistToolNames)`, filter `await context.getTools()` by `allowed` and throw when no tool is left. Choose with `chooseTool()`, and return `{ tool: 'none', args: {}, result: null }` on `'none'`. Otherwise find the chosen tool, extract its arguments with `extractArguments()`, and execute it once with `executeDiscoveredTool(context, tool, args)`. Call `signal?.throwIfAborted()` at the start and again right before executing, so a Stop never lets the action through.

<details>
  <summary>runAgent() skeleton</summary>

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
  <summary>runAgent() solution</summary>

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

Save, let the page reload, click each suggestion and then **Run agent**. With the simulation you get this table (we ran the same code in Node):

| Request                                            | Tool                    | Arguments              | Watchlist after the run |
| -------------------------------------------------- | ----------------------- | ---------------------- | ----------------------- |
| Add to watchlist: Sintel                           | `add_to_watchlist`      | `{"movieId":"sintel"}` | Sintel                  |
| Add to watchlist: Elephants Dream                  | `add_to_watchlist`      | `{"movieId":"dream"}`  | Sintel, Elephants Dream |
| Get watchlist                                      | `get_watchlist`         | `{}`                   | Sintel, Elephants Dream |
| Remove from watchlist: Sintel                      | `remove_from_watchlist` | `{"movieId":"sintel"}` | Elephants Dream         |
| What does a bass filter do?                        | `none`                  | –                      | nothing executed        |
| Could you put the bunny film on my list for later? | `none`                  | –                      | nothing executed        |

The last row shows the simulation's limit: it does not understand "put … on my list". The real on-device model should choose `add_to_watchlist` with `bunny` here; try it in native mode and compare. A real model's results can vary between runs, so watch section **C**: the watchlist is the truth, not the model's choice. The line **Base session: … tokens (unchanged by runs)** stays the same however many requests you send, because every decision runs in a clone.

Now measure what a run costs. Each run shows `… ms · 0 cloud tokens` next to the request. In the simulation each `prompt()` waits 250 ms, while `clone()` and `append()` return at once, so count the prompts: an add or remove run makes two (choose + extract, about 500 ms), and **Get watchlist** or a `none` run makes one (about 250 ms). With the native model, write down your own numbers:

> Add to watchlist: Sintel → \_\_\_ ms · Get watchlist → \_\_\_ ms

Then open DevTools → **Network**, clear the list and click **Run agent** once more. Requests to a model API: 0. Choosing a tool and extracting arguments are local inference, and `executeTool()` runs your own page code, so nobody bills tokens for the run. The local cost is the model download, memory and the milliseconds above. A cloud agent sends the tool descriptions, the request and every tool result to a remote model on every turn instead. The trade-off: a small on-device model is less capable than a large cloud model, so keep its job narrow (one choice, one argument object) and keep the validation in code.

Well done! You have an agent that costs nothing per request.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 4-5
```

Expected result:

```
  ✔ Step 1 · choiceSchema() allows exactly "none" and the offered tool names
  ✔ Step 2 · chooseTool() decides in a fresh clone with responseConstraint and destroys it
  ✔ Step 3 · extractArguments() uses the tool schema as responseConstraint in a fresh clone
  ✔ Step 4 · runAgent() discovers, chooses, extracts and executes exactly once
  ✔ Step 4 · runAgent() stops on 'none' and never offers tools outside `allowed`

  5 passed, 0 failed
```

The check uses the simulated Prompt API and its own small set of watchlist tools, so it does not depend on your 4.4 file. The `'none'` case and the "unknown tool" case use a scripted stand-in session with a fixed answer, because the simulation's keyword matching is not a fair test of judgement. The check verifies your code's control flow (clone, constrain, validate, execute once), not the quality of a real model.

### Troubleshooting

| You see                                                   | What to do                                                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 4-5, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                         |
| **Needs 4.4** / `…exercise 4-4…` hint after **Prepare**   | Finish your 4.4 file, or run `pnpm lab:solve 4-4`.                                                                |
| `The Prompt API is not exposed by this browser`           | Check `/preflight`, or turn on the simulation.                                                                    |
| `document.modelContext is missing`                        | Enable `chrome://flags/#enable-webmcp-testing` and relaunch, or turn on the simulation.                           |
| `Unexpected token … is not valid JSON`                    | Pass `responseConstraint` to `prompt()` in Steps 2 and 3, so the model answers in JSON instead of prose.          |
| `The model chose a tool that is not offered`              | Your check works: the model proposed something outside the list. In native mode, try a clearer request.           |
| The simulation always answers `none`                      | Use the tool's words in the request ("add to watchlist", "remove from watchlist", "get watchlist"), or go native. |
| `movieId must be one of: …`                               | Your 4.4 handler rejected the model's arguments: the second line of defence doing its job. Rephrase the request.  |
| `InvalidStateError: The session has been destroyed`       | Call `destroy()` on the clone in `finally`, and leave the base session alive.                                     |

Still stuck? `pnpm lab:solve 4-5` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 4-5` brings back the starter file.

> [!NOTE]
> The cinema has a bigger version of this agent on **/preflight → Run local agent evaluations**. In `apps/movie-theater/src/app/features/evaluation/evaluation.agent.ts`, `selectionSchema()` lets the model flag the needed tools (a boolean per tool), `parameterSchema()` extracts arguments in fresh context, and the `parse…()` functions reject malformed or undiscovered choices: your Steps 1–3, for several tools. `evaluation.executor.ts` validates the whole plan before the first change, stops at the first handler error and never retries an action. `evaluation.model.ts` grades the observable outcome (slider values, playhead), not the model's wording, including a "question, change nothing" case like our `none`.

## 5. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Let the agent answer in words after the action: one more fresh clone that turns `run.result` into one friendly sentence. It is still one action, and the summary cannot call tools.
- Support two actions ("add Sintel and remove Dream"): ask for a plan (an array of `{ tool, args }`), validate every step first, then execute them in order. Compare your design with `executePlan()` in the reference app.
- Measure each part of a run with `performance.now()` and show where the time goes: clone, append, prompt.
