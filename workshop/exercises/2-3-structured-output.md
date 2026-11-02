# Exercise 2.3: Structured output

A chat answer works for people, but an app cannot act on "I would suggest Sintel, it's a lovely fantasy film". To open the right movie page, the app needs data: `{ "movieId": "sintel", "reason": "…" }`. In this exercise we will make the model answer in that shape, and then check the answer in code before the app uses it.

**Page:** http://127.0.0.1:4200/lab/2-3 · **You edit:** `apps/movie-theater/src/app/lab/exercises/2-3-structured-output/exercise.ts` · **Check:** `pnpm lab:check 2-3` · **Time:** ~15 min · **Level:** core

## Goal

At the end of this exercise **Recommend (with schema)** shows a **Validated** card whose **Open movie** button opens a real movie page, and any answer that is not a valid recommendation from our catalogue is rejected in the log instead of shown.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/2-3 in Chrome. If the page says **NO BUILT-IN AI DETECTED**, turn on **Use simulated browser AI**. The simulation fills the schema with a keyword match, so the shape is right but the choice is simple.

Open `exercise.ts`. `promptOptions`, `systemPrompt` (with the catalogue and its real IDs) and `createSession()` at the top are given. You write the three functions below them, each of which still calls `todo('2-3', …)`.

Four terms we will use throughout:

| Term                     | Meaning                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **JSON**                 | A text format for data: `{ "movieId": "sintel", "reason": "Dragons" }`. `JSON.parse(text)` turns such text into a JavaScript object, and throws a `SyntaxError` when the text is not valid JSON.                                                                  |
| **JSON schema**          | A JSON object that describes what other JSON must look like: which fields, which types, which values are allowed. It is a standard ([json-schema.org](https://json-schema.org)), also used by WebMCP and MCP tools later today.                                   |
| **`responseConstraint`** | An option of `prompt()` and `promptStreaming()`. You pass a JSON schema and the browser restricts the model's output to text that matches it. This is called _constrained decoding_: while the model writes, choices that would break the schema are not allowed. |
| **Validation**           | Checking data in your own code before you act on it. The schema controls the shape; validation proves that the values make sense for your app.                                                                                                                    |

## 1. Describe the answer as a JSON schema

The model can only stick to a shape we describe. We want an object with two fields: `movieId`, one of our three IDs, and `reason`, any text. `enum` means "one of these values". `required` lists the fields that must be present, and `additionalProperties: false` forbids any other field.

In `recommendationSchema()`, return that schema object.

> [!TIP]
> Build the `enum` with `movies.map((movie) => movie.id)`. The schema then follows the catalogue, and a new movie is included without touching this function.

<details>
  <summary>recommendationSchema() solution</summary>

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

Save. In section **A**, click **Preview recommendationSchema()**. You see the schema, and the `enum` of `movieId` lists `"sintel"`, `"bunny"` and `"dream"`.

## 2. Ask for JSON that follows the schema

It is the same `session.prompt()` as in exercise 2.1, with one more option: `responseConstraint`. The answer is still a string: JSON text, not yet an object. We return it unchanged and let Step 3 turn it into data. Keeping the two apart lets the page show you the raw text.

In `askForJson()`, call `session.prompt()` with the request and pass the schema as `responseConstraint`, together with the `signal`.

> [!TIP]
> Put `responseConstraint` inside the options object, the second argument of `prompt()`. Without it, the model answers in prose.

<details>
  <summary>askForJson() solution</summary>

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

Save. In section **B**, click **Recommend (with schema)**. Under "Raw answer with responseConstraint" you see JSON text such as `{"movieId":"sintel","reason":"…"}`, and the log shows a 🧩 hint for Step 3. Now click **Ask without a schema**: the raw answer is ordinary prose, which no program can use reliably.

> [!NOTE]
> By default, the Prompt API explainer lets the browser add the schema to the model's input, which uses context tokens. The option `omitResponseConstraintInput: true` turns that off; your prompt must then describe the format itself.

## 3. Turn the text into a Recommendation you can trust

Two things can still go wrong, and both must stop here, before the app navigates anywhere:

1. The text is not JSON at all, for example a cut-off answer or a model that ignored the constraint. `JSON.parse()` throws a `SyntaxError` with a technical message.
2. The JSON is valid but the data is not. `{"movieId":"titanic","reason":"A classic."}` is perfect JSON, and we do not have Titanic. A schema check in the browser is not a guarantee your app can rely on, and the same function might later receive data from somewhere else (an old cache, a WebMCP agent, an attacker). `validateRecommendation()` from the catalogue checks that both fields are non-empty strings and looks the ID up with `getMovie()`, which throws for an unknown ID.

In `parseRecommendation()`, parse the text into a value of type `unknown`, throw your own clear `Error` when parsing fails, and return `validateRecommendation(value)`.

> [!WARNING]
> Wrap `JSON.parse()` in `try`/`catch` and throw a new `Error` that says the answer is not valid JSON. The check expects your own message, not the raw `SyntaxError`.

<details>
  <summary>parseRecommendation() skeleton</summary>

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

In `try`, assign `JSON.parse(text)` to `value`. In `catch`, throw an `Error` whose message shows the first 80 characters of the text. Then hand `value` to `validateRecommendation()`: it decides what the value is.

<details>
  <summary>parseRecommendation() solution</summary>

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

| Code                                     | Meaning                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `let value: unknown`                     | `unknown` means "we do not know what this is yet". TypeScript will not let us use it as a `Recommendation` unchecked. |
| `try { … } catch { throw new Error(…) }` | Replace the `SyntaxError` with a message that says what went wrong and shows the start of the text.                   |
| `text.slice(0, 80)`                      | Only the first 80 characters, so a long answer does not flood the log.                                                |
| `validateRecommendation(value)`          | Returns `{ movieId, reason }` (and nothing else) when the data is valid, throws an `Error` otherwise.                 |

</details>

Save, then try it:

1. In section **B**, click **Recommend (with schema)**. A green **Validated** card appears with the movie's title, genre and year, and an **Open movie** button that opens `/movies/<id>`. The link always works, because the ID was checked.
2. Click **Ask without a schema**. The log now shows `parseRecommendation(): Error: The answer is not valid JSON: …`, and no card appears. Bad output is rejected, not shown as a broken link.
3. In section **C**, click **Run parseRecommendation() on these answers**. Only the first answer is accepted. The others are rejected with a reason: unknown movie, missing reason, text around the JSON, cut-off JSON.
4. Try the suggestion **I want Titanic.** With the schema, the model cannot write `"titanic"` at all: the `enum` leaves only the three real IDs. Section C shows why the app checks anyway.

Valid JSON is not valid data, and valid data is not true data. Even a validated answer only proves that the movie exists. Whether the reason is correct is still model text that people should judge.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 2-3
```

Expected result:

```
  ✔ Step 1 · the schema allows only real movie IDs and exactly two required fields
  ✔ Step 2 · askForJson passes the schema as responseConstraint and returns JSON text
  ✔ Step 3 · parseRecommendation accepts a valid answer
  ✔ Step 3 · parseRecommendation rejects broken JSON and data that is not in the catalogue

  4 passed, 0 failed
```

Well done! The check runs your file in Node against the simulated AI. The simulation fills your schema like constrained decoding would (it picks one of the `enum` IDs), and the last check feeds your parser six bad answers. It does not judge whether a real model's reason is true.

### Troubleshooting

| You see                                                   | What to do                                                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 2-3, Step N` in the log | That function still calls `todo(...)`. Replace the whole line, then save.                                                                      |
| The raw answer is prose, not JSON, even "with schema"     | Pass `responseConstraint` in `askForJson`, inside the options object, and check its spelling.                                                  |
| An error about the schema or the response constraint      | The browser could not use this schema. Compare yours with Step 1 and keep to `type`, `properties`, `enum`, `required`, `additionalProperties`. |
| `SyntaxError: Unexpected token …` in the log              | Wrap `JSON.parse` in `try`/`catch` and throw your own clear `Error`.                                                                           |
| `Unknown movie: titanic`                                  | Nothing to fix: `validateRecommendation()` rejected an ID that is not in the catalogue, as intended.                                           |
| `The Prompt API is not exposed by this browser`           | Use desktop Chrome, check `/preflight`, or turn on **Use simulated browser AI**.                                                               |
| The page did not change after saving                      | Check the app's terminal for a compile error. It names the file and the line.                                                                  |

Still stuck? `pnpm lab:solve 2-3` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 2-3` brings back the starter file.

> [!NOTE]
> The cinema app uses the same pattern. `apps/movie-theater/src/app/features/concierge/concierge.prompts.ts` has the same `recommendationSchema`, with the IDs taken from the catalogue. `apps/movie-theater/src/app/features/concierge/concierge.service.ts` → `recommend()` first streams a readable explanation (exercise 2.2), then asks the same session for the structured choice with `responseConstraint`, then runs `validateRecommendation(JSON.parse(json))`. `libs/catalogue/src/recommendation.ts` holds `validateRecommendation()` itself; its comment explains that it checks structure and catalogue membership, not the truth of the reason.

## 4. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Add a third field `confidence` (`{ type: 'number', minimum: 0, maximum: 1 }`) to the schema. Does the model fill it? Can you trust the number?
- Ask for two recommendations: `{ type: 'array', items: <your object>, minItems: 2, maxItems: 2 }`, and validate each item.
- Combine with exercise 2.2: stream the schema-constrained answer with `promptStreaming(..., { responseConstraint })`. Why can you only `JSON.parse` it at the end?
