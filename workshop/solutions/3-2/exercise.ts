// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.2 · Streaming summaries — SOLUTION
// Copy into place with: pnpm lab:solve 3-2
// ─────────────────────────────────────────────────────────────────────────────

/** Key points in plain text: long enough to watch the text arrive. */
export function streamOptions(
  length: SummarizerLength,
): SummarizerCreateOptions {
  return {
    expectedInputLanguages: ['en'],
    outputLanguage: 'en',
    type: 'key-points',
    format: 'plain-text',
    length,
  };
}

/** Given (you wrote this in exercise 3.1): feature detection, availability, create. */
export async function createSummarizer(
  options: SummarizerCreateOptions,
  signal?: AbortSignal,
): Promise<Summarizer> {
  if (typeof Summarizer === 'undefined')
    throw new Error(
      'The Summarizer API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if ((await Summarizer.availability(options)) === 'unavailable')
    throw new Error('The Summarizer cannot run these options on this device.');
  return Summarizer.create({ ...options, signal });
}

/** Given: the one-shot version. Nothing appears until the whole summary is ready. */
export async function summarizeOnce(
  text: string,
  options: SummarizerCreateOptions,
  signal?: AbortSignal,
): Promise<string> {
  const summarizer = await createSummarizer(options, signal);
  try {
    return await summarizer.summarize(text, { signal });
  } finally {
    summarizer.destroy();
  }
}

/** What timedStreaming() reports back to the page. */
export interface StreamTiming {
  text: string;
  /** Milliseconds from the start until the first piece of text arrived. */
  firstTextMs: number;
  /** Milliseconds from the start until the stream finished. */
  totalMs: number;
}

/**
 * STEP 1 · Read a text stream piece by piece.
 * Each chunk is NEW text: add it to what you have and call onText(textSoFar).
 * When the signal aborts, cancel the reader. Always release the reader's lock.
 * Return the complete text.
 */
export async function readText(
  stream: ReadableStream<string>,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = stream.getReader();
  // Aborting the request alone may leave read() waiting: cancel the reader too.
  const cancel = () => {
    reader.cancel(signal?.reason).catch(() => undefined);
  };
  signal?.addEventListener('abort', cancel, { once: true });
  let text = '';
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      text += value;
      onText(text);
    }
    return text;
  } finally {
    // Runs on success, on errors and on Stop: the stream is never left locked.
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

/**
 * STEP 2 · Stream a summary.
 * Create a summarizer, start summarizeStreaming(text, { signal }), read it with
 * readText(), and destroy the summarizer afterwards (also on errors and Stop).
 */
export async function summarizeStreaming(
  text: string,
  options: SummarizerCreateOptions,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const summarizer = await createSummarizer(options, signal);
  try {
    const stream = summarizer.summarizeStreaming(text, { signal });
    return await readText(stream, onText, signal);
  } finally {
    summarizer.destroy();
  }
}

/**
 * STEP 3 · Measure what the viewer feels.
 * Run summarizeStreaming() and record when the FIRST text arrived and when
 * the stream finished, both in milliseconds since the start (performance.now()).
 */
export async function timedStreaming(
  text: string,
  options: SummarizerCreateOptions,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<StreamTiming> {
  const started = performance.now();
  let firstTextMs: number | undefined;
  const result = await summarizeStreaming(
    text,
    options,
    (textSoFar) => {
      // ??= assigns only once: the first time, while firstTextMs is still undefined.
      firstTextMs ??= performance.now() - started;
      onText(textSoFar);
    },
    signal,
  );
  const totalMs = performance.now() - started;
  return { text: result, firstTextMs: firstTextMs ?? totalMs, totalMs };
}
