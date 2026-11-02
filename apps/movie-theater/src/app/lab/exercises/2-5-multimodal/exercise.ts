/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2.5 · Multimodal prompts with text and images
// Guide: workshop/exercises/2-5-multimodal.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/2-5 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 2-5
// ─────────────────────────────────────────────────────────────────────────────
import { todo } from '../../shared/todo';

/** The question the page suggests: ask only about what can be seen. */
export const defaultQuestion =
  'Describe only what is visible in two sentences. Do not guess names or plot.';

/**
 * STEP 1 · Declare what the session will receive and write.
 * Input: English text AND an image. Output: English text.
 */
export function imageSessionOptions(): LanguageModelCreateCoreOptions {
  // TODO Step 1: return { expectedInputs: [text en, image], expectedOutputs: [text en] }.
  return todo('2-5', 'Step 1 (imageSessionOptions)');
}

/**
 * STEP 2 · Can this device read images?
 * Return 'missing' when the Prompt API does not exist, otherwise the answer of
 * availability() for the IMAGE options. Text support alone proves nothing.
 */
export async function checkImageSupport(): Promise<Availability | 'missing'> {
  // TODO Step 2: feature-detect LanguageModel, then availability(imageSessionOptions()).
  return todo('2-5', 'Step 2 (checkImageSupport)');
}

/**
 * STEP 3 · Build the message: one user message whose content is a list of
 * parts, first the question as text, then the picture as image.
 */
export function imageMessage(
  image: ImageBitmapSource,
  question: string,
): LanguageModelMessage[] {
  // TODO Step 3: return [{ role: 'user', content: [text part, image part] }].
  return todo('2-5', 'Step 3 (imageMessage)');
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
  // TODO Step 4: check support → create → prompt → destroy in finally.
  return todo('2-5', 'Step 4 (describeImage)');
}
