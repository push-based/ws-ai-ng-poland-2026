# Exercise 2.5: Multimodal prompts with text and images

Send a picture and a question to the on-device model in one message, and compare the answer with what you see. The picture never leaves your computer.

- **Page:** http://127.0.0.1:4200/lab/2-5
- **You edit:** `apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise.ts`
- **Check:** `pnpm lab:check 2-5`
- **Time:** ~15 min
- **Level:** core

> **Tip:** No built-in AI on your laptop? Turn on **Use simulated browser AI** on the page. The simulation answers with a fixed sentence, because no model looks at the picture. Setup is in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop).

No movie clips? They only exist after `pnpm media:download`. Use the file picker **…or your own picture**.

`defaultQuestion` is given. You write the four functions below it.

## 1. Declare text + image input

The browser needs to know in advance that a session will receive images.

In `imageSessionOptions()`, list English text and an image in `expectedInputs`: `{ type: 'text', languages: ['en'] }` and `{ type: 'image' }`. The output is English text.

<details>
  <summary>Solution: <code>imageSessionOptions()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise.ts
export function imageSessionOptions(): LanguageModelCreateCoreOptions {
  return {
    expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  };
}
```

</details>

## 2. Check whether this device can read images

A device can be `'available'` for text and still `'unavailable'` for text + image.

In `checkImageSupport()`, return `'missing'` when `LanguageModel` does not exist. Otherwise return `LanguageModel.availability(imageSessionOptions())`.

<details>
  <summary>Solution: <code>checkImageSupport()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise.ts
export async function checkImageSupport(): Promise<Availability | 'missing'> {
  if (typeof LanguageModel === 'undefined') return 'missing';
  return LanguageModel.availability(imageSessionOptions());
}
```

</details>

### Try it

1. In section **A**, click **Check image support**.
   - You see one badge for text and one for text + image.

## 3. Build a message with a text part and an image part

A string has no room for a picture, so we write the message out in full.

In `imageMessage()`, return an array with one `user` message. Its `content` is the question as a `text` part, then the picture as an `image` part. A part looks like `{ type: 'text', value: question }` or `{ type: 'image', value: image }`.

<details>
  <summary>Solution: <code>imageMessage()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise.ts
export function imageMessage(
  image: ImageBitmapSource,
  question: string,
): LanguageModelMessage[] {
  return [
    {
      role: 'user',
      content: [
        { type: 'text', value: question },
        { type: 'image', value: image },
      ],
    },
  ];
}
```

</details>

## 4. Describe the image

One picture, one answer: create a session for this request and destroy it right after.

In `describeImage()`:

- Throw an `Error` when `checkImageSupport()` says `'missing'` or `'unavailable'`.
- Create a session with `imageSessionOptions()` and the `signal`.
- In `try`, `return await session.prompt(imageMessage(image, question), { signal })`.
- In `finally`, destroy the session.

> **Warning:** Keep the `await` in `return await`. Without it, `finally` destroys the session while the model is still working.

<details>
  <summary>Hint · skeleton: <code>describeImage()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise.ts
export async function describeImage(
  image: ImageBitmapSource,
  question: string,
  signal?: AbortSignal,
): Promise<string> {
  const support = /* Step 2 */;
  if (/* no image input */) {
    throw new Error(/* say which answer you got */);
  }

  const session = /* create with the image options and the signal */;
  try {
    /* prompt with Step 3's message, and wait for the answer */
  } finally {
    /* release the session */
  }
}
```

</details>

<details>
  <summary>Solution: <code>describeImage()</code></summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise.ts
export async function describeImage(
  image: ImageBitmapSource,
  question: string,
  signal?: AbortSignal,
): Promise<string> {
  // 4a · Image input is checked on its own: text support does not imply it.
  const support = await checkImageSupport();
  if (support === 'missing' || support === 'unavailable') {
    throw new Error(`No image input on this device (${support}).`);
  }

  // 4b · A one-shot session: created for this picture, released right after.
  const session = await LanguageModel.create({
    ...imageSessionOptions(),
    signal,
  });
  try {
    return await session.prompt(imageMessage(image, question), { signal });
  } finally {
    // Runs after success AND after an error or Stop, so no session is left behind.
    session.destroy();
  }
}
```

</details>

### Try it

1. In section **B**, play a clip for a moment and click **Capture frame**.
2. In section **C**, click **Describe**.
3. Compare the answer with the picture.
   - If the model names a character or tells the plot, it is guessing.
4. Change the question to _"Who is this and what happens next?"_ and compare again.

---

## Check your work

```sh
pnpm lab:check 2-5
```

All 5 checks should pass.

Stuck?

- `pnpm lab:solve 2-5` puts the solution in place and keeps your file as `exercise.ts.mine`.
- `pnpm lab:reset 2-5` restores the starter.

| You see                                                                        | What to do                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **clip missing** under the video                                               | Run `pnpm media:download` and restart the app, or use your own picture.          |
| `No video frame yet`                                                           | Press play for a moment, then **Capture frame**.                                 |
| Text + image is `unavailable`, text is `available`                             | Your device cannot take image input. Use the simulation to finish.               |
| `NotSupportedError` when prompting                                             | Add `{ type: 'image' }` in Step 1 and use `imageSessionOptions()` in `create()`. |
| An `AbortError` right after **Describe**, or the check asks for `return await` | Write `return await session.prompt(...)` in Step 4.                              |

More help: [general troubleshooting](../README.md#5--general-troubleshooting).

> **Note:** In the cinema app: open a movie and click **Describe this shot** (`describe()` in `ai/prompt/prompt.api.ts`).

## Bonus

- Stream the description with `session.promptStreaming(imageMessage(...), { signal })`.
- Send two frames in one message and ask what changed.
