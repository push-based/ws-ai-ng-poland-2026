# Exercise 2.5: Multimodal prompts with text and images

_Multimodal_ means the model accepts more than one kind of input: here text and an image in the same message. In this exercise we will capture a frame from a movie clip (or pick any picture), send it to the on-device model together with a question, and compare the answer with what we can see ourselves. The picture never leaves your computer.

**Page:** http://127.0.0.1:4200/lab/2-5 · **You edit:** `apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise.ts` · **Check:** `pnpm lab:check 2-5` · **Time:** ~15 min · **Level:** core

## Goal

At the end of this exercise **Describe** sends a captured frame (or your own picture) with your question to the model, and you can point at every detail in its answer that the picture does not show.

## 0. Setup

Start the app as described in the [workshop README](../README.md#1--one-time-setup-do-this-before-the-workshop), then open http://127.0.0.1:4200/lab/2-5 in Chrome. The movie clips come from `pnpm media:download`, the recommended option in the one-time setup. If you started the app with `pnpm lab:start` instead, there are no clips. Use the file picker **…or your own picture** instead: any picture from your computer works.

If the page says **NO BUILT-IN AI DETECTED**, turn on **Use simulated browser AI**. Your code then runs, but no model looks at the picture: the simulation answers with a fixed sentence. The code you write is the same.

Open `exercise.ts`. `defaultQuestion` at the top is given. You write the four functions below it, each of which still calls `todo('2-5', …)`.

Five terms we will use throughout:

| Term                    | Meaning                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Modality**            | A kind of input or output: text, image or audio.                                                                                                                                                       |
| **`expectedInputs`**    | The modalities (and languages) a session will receive. You declare them before creating the session, so the browser can check support and load what is needed.                                         |
| **Content parts**       | Instead of a plain string, a message's `content` can be a list of parts: `{ type: 'text', value: '…' }` and `{ type: 'image', value: <picture> }`. The model reads them together, in order.            |
| **`ImageBitmapSource`** | Anything the browser can turn into a picture: a `<canvas>`, an `<img>`, a video frame, an `ImageBitmap`, a `Blob`… The page always sends the preview `<canvas>`, so the model gets the pixels you see. |
| **Hallucination**       | An answer that sounds confident but is not supported by the input. A model that names a character it cannot see, or tells the plot, is hallucinating.                                                  |

## 1. Declare text + image input

In exercises 2.1–2.4 the session only received English text. Now it will also receive a picture, and the browser needs to know that in advance to check support and load what is needed.

In `imageSessionOptions()`, list both input types in `expectedInputs`: English text and an image. The output is still English text. Images have no language, so the image entry has only `type`.

<details>
  <summary>imageSessionOptions() solution</summary>

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

Save and run `pnpm lab:check 2-5` in a second terminal. The `Step 1 · imageSessionOptions declares text + image input and text output` line turns ✔. The page uses these options from Step 2 onwards.

## 2. Check whether this device can read images

It's the same routine as always: feature detection, then `availability()` with the exact options. What's new is that availability is answered per option set. A device can say `'available'` for text and still say `'unavailable'` (or `'downloadable'`) for text + image.

In `checkImageSupport()`, return `'missing'` when `LanguageModel` does not exist, so the page can show a badge instead of an error. Otherwise return the answer of `availability()` for the image options.

> [!TIP]
> Check image support on its own, with the image options: pass `imageSessionOptions()` to `availability()`. A yes for text tells you nothing about images.

<details>
  <summary>checkImageSupport() solution</summary>

```ts
// apps/movie-theater/src/app/lab/exercises/2-5-multimodal/exercise.ts
export async function checkImageSupport(): Promise<Availability | 'missing'> {
  if (typeof LanguageModel === 'undefined') return 'missing';
  return LanguageModel.availability(imageSessionOptions());
}
```

</details>

Save. In section **A**, click **Check image support**. You see two badges: **Text only** (the page checks that itself) and **Text + image (checkImageSupport)** (your function). In native mode compare them: they are separate answers. In simulation mode both say the same.

## 3. Build a message with a text part and an image part

Until now we passed a string to `prompt()`. A string is a shortcut for "one user message with one text part", and it has no room for a picture. For an image we write the message out in full: an array with one message, role `'user'`, whose `content` is an array of parts.

In `imageMessage()`, return that array. Put the question first as a `text` part, then the picture as an `image` part. The picture is the object itself (here the canvas), not a file name and not a description of it.

<details>
  <summary>imageMessage() solution</summary>

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

Run `pnpm lab:check 2-5` again: `Step 3 · imageMessage = one user message with a text part and an image part` turns ✔. Step 4 sends this message.

## 4. Describe the image with a one-shot session

One picture, one question, one answer: there is no follow-up conversation, so a session that outlives the answer only holds memory on the device. We create a session for this request and destroy it right after, with the pattern `create → try { prompt } finally { destroy }`. `finally` runs after a successful answer, after an error and after Stop, so no session is ever left behind.

In `describeImage()`, check image support with Step 2 first and throw a clear `Error` when it is `'missing'` or `'unavailable'`. Then create a session with `imageSessionOptions()`, prompt it with `imageMessage()` inside `try`, and destroy it in `finally`.

> [!WARNING]
> Write `return await session.prompt(...)` inside the `try`. With `await`, `finally` waits for the answer. Without it, `finally` runs at once and destroys the session while the model is still working.

<details>
  <summary>describeImage() skeleton</summary>

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

Throw when `support` is `'missing'` or `'unavailable'`; `'downloadable'` is fine, because `create()` downloads the model. Spread `imageSessionOptions()` into `LanguageModel.create()` and add the `signal`. In `try`, `return await session.prompt(imageMessage(image, question), { signal })`. In `finally`, call `session.destroy()`.

<details>
  <summary>describeImage() solution</summary>

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

| Code                                                         | Meaning                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `await checkImageSupport()`                                  | Step 2: a clear error before any session is created on a device without image input. |
| `LanguageModel.create({ ...imageSessionOptions(), signal })` | A session that accepts text and images, and can be cancelled.                        |
| `return await session.prompt(…)`                             | Wait for the answer inside `try`, so `finally` runs only after it.                   |
| `finally { session.destroy(); }`                             | Release the session after success, an error or Stop alike.                           |

</details>

Save, then try it:

1. In section **B**, choose a movie, press play for a moment, then click **Capture frame**. The clip pauses and the frame appears in the preview on the right. If you see **clip missing**, use **…or your own picture**.
2. In section **C**, keep the question _"Describe only what is visible in two sentences. Do not guess names or plot."_ and click **Describe**. In simulation mode the answer is the fixed `Simulated description: …` sentence.
3. Compare the answer with the preview. Is every detail in the picture? The model sees only these pixels: no title, no sound, no story. If it names a character or explains the plot, it is guessing: that is a hallucination, even when it sounds sure.
4. Change the question to _"Who is this and what happens next?"_ and compare. This question invites guessing; check which details the model makes up now.
5. Try your own photo with the file picker. The page scales large pictures down to at most 1024 px on the longest side before sending.

Nice! That last comparison is the part no check can do for you.

## Check your work

In a second terminal (keep the app running in the first), run:

```sh
pnpm lab:check 2-5
```

Expected result:

```
  ✔ Step 1 · imageSessionOptions declares text + image input and text output
  ✔ Step 2 · checkImageSupport asks availability() about IMAGE input
  ✔ Step 3 · imageMessage = one user message with a text part and an image part
  ✔ Step 4 · describeImage creates an image session, sends the parts and destroys it
  ✔ Step 4 · describeImage destroys the session after an error and refuses when images are unavailable

  5 passed, 0 failed
```

The check runs your file in Node, where there is no canvas: a plain object stands in for the picture. It verifies the options, the availability check, the message shape and that the session is destroyed after success, after an error and not too early. It cannot tell whether a real model described your image correctly; only you can, by comparing.

### Troubleshooting

| You see                                                              | What to do                                                                                                             |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 🧩 `Not implemented yet: exercise 2-5, Step N` in the log            | That function still calls `todo(...)`. Replace the whole line, then save.                                              |
| **clip missing** under the video                                     | The clips are generated locally. Run `pnpm media:download`, restart the app and reload, or use your own picture.       |
| `No video frame yet` in the log                                      | The clip has not loaded a frame. Press play for a moment, then **Capture frame**.                                      |
| Text + image says `unavailable` but text says `available`            | Your device or Chrome version cannot take image input, which is the case Step 2 detects. Use the simulation to finish. |
| `No image input on this device`                                      | Your Step 4 check works. See the row above.                                                                            |
| An error such as `NotSupportedError` when prompting with the picture | Add `{ type: 'image' }` to `expectedInputs` in Step 1, and spread `imageSessionOptions()` into `create()` in Step 4.   |
| An `AbortError` or a "destroyed" error right after **Describe**      | Write `return await session.prompt(...)` in Step 4, so `finally` waits for the answer.                                 |
| The answer is a fixed sentence about "a central subject"             | You are in simulation mode: no model looked at the picture. Turn the switch off on a device with native support.       |
| The page did not change after saving                                 | Check the app's terminal for a compile error. It names the file and the line.                                          |

Still stuck? `pnpm lab:solve 2-5` copies the reference solution into place and saves your version as `exercise.ts.mine`. `pnpm lab:reset 2-5` brings back the starter file.

> [!NOTE]
> The cinema app uses the same pattern. `apps/movie-theater/src/app/ai/prompt/prompt.api.ts` → `describe()` has the same image options, the same content parts and `session.destroy()` in `finally`; it streams the answer (exercise 2.2) instead of waiting for it. `apps/movie-theater/src/app/features/player/player.ts` → `capture()` pauses the video and copies the frame into a canvas at the video's own resolution. In the cinema, open a movie and click **Describe this shot**.

## 5. BONUS: Stretch goals

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

- Stream the description: use `session.promptStreaming(imageMessage(...), { signal })` and the reading loop from exercise 2.2.
- Send two images in one message (two frames a few seconds apart) and ask what changed.
- Ask for structured output (exercise 2.3): a schema with `{ colours: string[], people: number, indoors: boolean }`. Which fields can you check yourself by looking?
