/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2.4 · Managing the context window
// Guide: workshop/exercises/2-4-context-window.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/2-4 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 2-4
// ─────────────────────────────────────────────────────────────────────────────
import { movies } from '@nano-cinema/catalogue';
import { todo } from '../../shared/todo';

/** The session reads and writes English text (the same options as in exercise 2.1). */
export const promptOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/** Deliberately short, so you can watch the conversation itself fill the context. */
export const systemPrompt = `You are the concierge of Nano Cinema. Our movies: ${movies
  .map((movie) => `${movie.title} (${movie.year}, ${movie.genre})`)
  .join('; ')}. Answer in two short sentences.`;

/** What compact() asks the old session to write before it is replaced. */
export const summaryInstruction =
  'Summarize our conversation so far in at most three sentences. Keep the viewer’s preferences and the movies mentioned.';

export interface ContextStats {
  /** Tokens already in the session (system prompt + every turn so far). */
  used: number;
  /** The most tokens this session can hold. */
  window: number;
  /** used / window as a whole number from 0 to 100. */
  percent: number;
}

export interface Measurement {
  /** Tokens this message would add. */
  needed: number;
  /** Tokens still free in the session. */
  remaining: number;
  fits: boolean;
}

export interface Compacted {
  session: LanguageModel;
  summary: string;
}

/**
 * GIVEN · already complete (you wrote the same routine in exercise 2.1).
 * Creates a session that starts with the system prompt, followed by any
 * `extraPrompts` you pass (Step 5 uses this to seed the summary).
 */
export async function createSession(
  extraPrompts: LanguageModelMessage[] = [],
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
    initialPrompts: [
      { role: 'system', content: systemPrompt },
      ...extraPrompts,
    ],
    signal,
  });
}

/**
 * STEP 1 · How full is the session?
 * Read session.contextUsage and session.contextWindow. Return percent 0 when
 * the window is 0, so the page never divides by zero.
 */
export function contextStats(session: LanguageModel): ContextStats {
  // TODO Step 1: return { used, window, percent }.
  return todo('2-4', 'Step 1 (contextStats)');
}

/**
 * STEP 2 · Measure a message BEFORE sending it.
 * session.measureContextUsage(text) says how many tokens it would add,
 * without sending it. Compare that with the free space.
 */
export async function measureMessage(
  session: LanguageModel,
  text: string,
): Promise<Measurement> {
  // TODO Step 2: return { needed, remaining, fits }.
  return todo('2-4', 'Step 2 (measureMessage)');
}

/**
 * STEP 3 · Get told when the session overflows.
 * The session fires a 'contextoverflow' event when old turns had to be
 * dropped. Call onOverflow each time, and return a function that stops listening.
 */
export function watchOverflow(
  session: LanguageModel,
  onOverflow: () => void,
): () => void {
  // TODO Step 3: addEventListener('contextoverflow', …); return a function that removes it.
  return todo('2-4', 'Step 3 (watchOverflow)');
}

/**
 * STEP 4 · Fork the conversation.
 * clone() copies the session with everything in its context. After that the
 * two sessions are independent: a question in one is unknown to the other.
 */
export async function fork(
  session: LanguageModel,
  signal?: AbortSignal,
): Promise<LanguageModel> {
  // TODO Step 4: return session.clone() with the signal.
  return todo('2-4', 'Step 4 (fork)');
}

/**
 * STEP 5 · Compact a long conversation.
 * Ask the old session for a summary (summaryInstruction), create a fresh
 * session seeded with that summary, and only then destroy the old session.
 */
export async function compact(
  session: LanguageModel,
  signal?: AbortSignal,
): Promise<Compacted> {
  // TODO Step 5: summary → new session with the summary → destroy the old one → return both.
  return todo('2-4', 'Step 5 (compact)');
}
