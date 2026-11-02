// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2.2 · Streaming responses — SOLUTION
// Copy into place with: pnpm lab:solve 2-2
// ─────────────────────────────────────────────────────────────────────────────
import { movies } from '@nano-cinema/catalogue';

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
  return session.promptStreaming(question, { signal });
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
  const cancel = () => {
    // cancel() returns a promise. We do not need its result, but it must not
    // become an "unhandled rejection" if the stream has already failed.
    reader.cancel(signal.reason).catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  return () => signal.removeEventListener('abort', cancel);
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
  const reader = startStream(session, question, signal).getReader();
  const stopListening = cancelOnAbort(reader, signal);
  let text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      // A cancelled reader reports done: true. Turn that into an AbortError,
      // so the caller can tell "the user stopped it" from "the answer is complete".
      signal.throwIfAborted();
      if (done) break;
      text += value;
      onText(text);
    }
    return text;
  } finally {
    stopListening();
    reader.releaseLock();
  }
}
