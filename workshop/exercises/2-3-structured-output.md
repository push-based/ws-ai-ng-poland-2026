# Exercise 2.3: Structured output

An app cannot act on "I would suggest Sintel". It needs data: `{ "movieId": "sintel", "reason": "…" }`. Make the model answer in that shape, then check the answer in code before the app uses it.

- **Page:** http://127.0.0.1:4200/lab/2-3
- **You edit:** `apps/movie-theater/src/app/lab/exercises/2-3-structured-output/exercise.ts`
- **Check:** `pnpm lab:check 2-3`
- **Time:** ~15 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

`systemPrompt` and `createSession()` are given. You write the three functions below them.

## 1. Describe the answer as a JSON schema

A JSON schema describes what JSON must look like: which fields, which types, which values.

In `recommendationSchema()`, return a schema (`type: 'object'` with `properties` and `required`) for an object with two required string fields:

- `movieId`, with an `enum` built from `movies.map((movie) => movie.id)`
- `reason`

Set `additionalProperties: false`.

<details>
  <summary>Solution: <code>recommendationSchema()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-3-structured-output/exercise.ts
export function recommendationSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      // enum = "one of these values". The IDs come from the real catalogue.
      movieId: { type: 'string', enum: movies.map((movie) => movie.id) },
      reason: { type: 'string' },
    },
    required: ['movieId', 'reason'],
    additionalProperties: false,
  };
}
```

</details>

### Try it

1. In section **A**, click **Preview recommendationSchema()**.
   - The `enum` lists `"sintel"`, `"bunny"` and `"dream"`.

## 2. Ask for JSON that follows the schema

With `responseConstraint`, the browser restricts the model's output to text that matches the schema.

In `askForJson()`, return `session.prompt(request, { responseConstraint: recommendationSchema(), signal })`. The result is still a string.

<details>
  <summary>Solution: <code>askForJson()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-3-structured-output/exercise.ts
export async function askForJson(
  session: LanguageModel,
  request: string,
  signal?: AbortSignal,
): Promise<string> {
  return session.prompt(request, {
    responseConstraint: recommendationSchema(),
    signal,
  });
}
```

</details>

### Try it

1. In section **B**, click **Recommend (with schema)**.
   - The raw answer is JSON text.
2. Click **Ask without a schema**: the raw answer is prose.

## 3. Turn the text into data you can trust

Two things can still be wrong: the text is not JSON, or the JSON names a film we do not have. The given `validateRecommendation()` checks the second.

In `parseRecommendation()`:

- `JSON.parse()` the text inside `try`.
- In `catch`, throw your own `Error` that says the answer is not valid JSON.
- Return `validateRecommendation(value)`.

<details>
  <summary>Hint · skeleton: <code>parseRecommendation()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-3-structured-output/exercise.ts
export function parseRecommendation(text: string): Recommendation {
  let value: unknown;
  try {
    /* parse the text */
  } catch {
    /* throw a clear Error with the start of the text */
  }
  return /* check the fields and the catalogue */;
}
```

</details>

<details>
  <summary>Solution: <code>parseRecommendation()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-3-structured-output/exercise.ts
export function parseRecommendation(text: string): Recommendation {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`The answer is not valid JSON: ${text.slice(0, 80)}`);
  }
  // Valid JSON can still name a film we do not have. validateRecommendation()
  // checks the fields and looks the ID up in the real catalogue (getMovie).
  return validateRecommendation(value);
}
```

</details>

### Try it

1. Click **Recommend (with schema)**.
   - A green **Validated** card appears, with a working **Open movie** button.
2. Click **Ask without a schema**.
   - The log shows `The answer is not valid JSON`, and no card appears.
3. In section **C**, click **Run parseRecommendation() on these answers**.
   - Only the first one is accepted.

A validated answer proves that the movie exists. Whether the reason is true is still for people to judge.

---

## Check your work

```sh
pnpm lab:check 2-3
```

All 4 checks should pass.

Stuck?

- `pnpm lab:solve 2-3` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 2-3` restores the starter.

| You see                                   | What to do                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| The raw answer is prose, even with schema | Pass `responseConstraint` inside the options object of `prompt()`.              |
| An error about the schema                 | Keep to `type`, `properties`, `enum`, `required` and `additionalProperties`.    |
| `SyntaxError: Unexpected token …`         | Wrap `JSON.parse` in `try`/`catch` and throw your own `Error`.                  |
| `Unknown movie: titanic`                  | Nothing to fix: `validateRecommendation()` rejected an unknown ID, as intended. |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: `recommend()` in `features/concierge/concierge.service.ts` asks with `responseConstraint`, then runs `validateRecommendation(JSON.parse(json))`.

## Bonus

- Add a `confidence` field (`{ type: 'number', minimum: 0, maximum: 1 }`). Can you trust the number?
- Ask for two recommendations with an array schema, and validate each item.
