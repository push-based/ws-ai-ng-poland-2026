/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.2 · Streaming summaries
// Guide: workshop/exercises/3-2-streaming-summaries.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/3-2 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 3-2
// ─────────────────────────────────────────────────────────────────────────────
import { todo } from '../../shared/todo';

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
  // TODO Step 1: getReader(), loop over read(), cancel on abort, releaseLock() in finally.
  return todo('3-2', 'Step 1 (readText)');
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
  // TODO Step 2: create, summarizeStreaming, readText, destroy in finally.
  return todo('3-2', 'Step 2 (summarizeStreaming)');
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
  // TODO Step 3: wrap onText to note the first arrival, then return the timings.
  return todo('3-2', 'Step 3 (timedStreaming)');
}
