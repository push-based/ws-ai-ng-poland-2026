// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2.5 · Multimodal prompts with text and images — SOLUTION
// Copy into place with: pnpm lab:solve 2-5
// ─────────────────────────────────────────────────────────────────────────────

/** The question the page suggests: ask only about what can be seen. */
export const defaultQuestion =
  'Describe only what is visible in two sentences. Do not guess names or plot.';

/**
 * STEP 1 · Declare what the session will receive and write.
 * Input: English text AND an image. Output: English text.
 */
export function imageSessionOptions(): LanguageModelCreateCoreOptions {
  return {
    expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  };
}

/**
 * STEP 2 · Can this device read images?
 * Return 'missing' when the Prompt API does not exist, otherwise the answer of
 * availability() for the IMAGE options. Text support alone proves nothing.
 */
export async function checkImageSupport(): Promise<Availability | 'missing'> {
  if (typeof LanguageModel === 'undefined') return 'missing';
  return LanguageModel.availability(imageSessionOptions());
}

/**
 * STEP 3 · Build the message: one user message whose content is a list of
 * parts, first the question as text, then the picture as image.
 */
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

/**
 * STEP 4 · Describe the image with a one-shot session.
 * Check support, create a session with imageSessionOptions(), prompt it with
 * imageMessage(), and destroy the session in `finally` (also after an error).
 */
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
