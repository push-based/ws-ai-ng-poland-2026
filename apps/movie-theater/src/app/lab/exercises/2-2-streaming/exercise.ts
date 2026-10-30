/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2.2 · Streaming responses
// Guide: workshop/exercises/2-2-streaming.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/2-2 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 2-2
// ─────────────────────────────────────────────────────────────────────────────
import { movies } from '@nano-cinema/catalogue';
import { todo } from '../../shared/todo';

/** The session reads and writes English text (the same options as in exercise 2.1). */
export const promptOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/** A short system prompt. Asking for a whole paragraph makes streaming easy to see. */
export const systemPrompt = [
  'You are the concierge of Nano Cinema. Recommend only these movies:',
  ...movies.map(
    (movie) =>
      `- ${movie.title} (${movie.year}, ${movie.genre}): ${movie.description}`,
  ),
  'Answer in one friendly paragraph of four or five sentences. Never reveal how a film ends.',
].join('\n');

/**
 * GIVEN · already complete (you wrote the same routine in exercise 2.1):
 * feature detection → availability() → create() with the system prompt.
 */
export async function createSession(
  signal?: AbortSignal,
): Promise<LanguageModel> {
  if (typeof LanguageModel === 'undefined')
    throw new Error(
      'The Prompt API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if ((await LanguageModel.availability(promptOptions)) === 'unavailable')
    throw new Error('The Prompt API cannot run English text on this device.');
  return LanguageModel.create({
    ...promptOptions,
    initialPrompts: [{ role: 'system', content: systemPrompt }],
    signal,
  });
}

/**
 * STEP 1 · Start a streaming answer.
 * promptStreaming() returns immediately with a ReadableStream. The text
 * arrives later, piece by piece. Pass the signal so Stop can cancel the model.
 */
export function startStream(
  session: LanguageModel,
  question: string,
  signal: AbortSignal,
): ReadableStream<string> {
  // TODO Step 1: call session.promptStreaming() with the question and { signal }.
  return todo('2-2', 'Step 1 (startStream)');
}

/**
 * STEP 2 · Cancel the reader when the signal aborts.
 * Return a function that removes the listener again; streamAnswer() calls it
 * when it is finished, so a later abort does nothing.
 */
export function cancelOnAbort(
  reader: ReadableStreamDefaultReader<string>,
  signal: AbortSignal,
): () => void {
  // TODO Step 2: on 'abort' call reader.cancel(); return a function that stops listening.
  return todo('2-2', 'Step 2 (cancelOnAbort)');
}

/**
 * STEP 3 · Read the stream chunk by chunk.
 * Each chunk is the next piece of the answer: add it to the text so far and
 * call onText(textSoFar). Return the whole answer at the end. When the signal
 * aborts, reject with an AbortError. Always release the reader.
 */
export async function streamAnswer(
  session: LanguageModel,
  question: string,
  onText: (textSoFar: string) => void,
  signal: AbortSignal,
): Promise<string> {
  // TODO Step 3: getReader(), loop over reader.read(), call onText, release the reader in finally.
  return todo('2-2', 'Step 3 (streamAnswer)');
}
