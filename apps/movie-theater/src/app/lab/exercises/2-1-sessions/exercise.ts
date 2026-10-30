/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2.1 · Sessions and system prompts
// Guide: workshop/exercises/2-1-sessions.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/2-1 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 2-1
// ─────────────────────────────────────────────────────────────────────────────
import { movies } from '@nano-cinema/catalogue';
import { todo } from '../../shared/todo';

/**
 * The facts the model is allowed to use: a small projection of the real
 * catalogue (no media files, colours or long notes), so it fits in the context.
 */
export const catalogueFacts = movies.map(
  ({ id, title, year, genre, mood, description }) => ({
    id,
    title,
    year,
    genre,
    mood,
    description,
  }),
);

/** The session declares the languages it will read and write. */
export const conciergeOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/**
 * STEP 1 · Write the system prompt.
 * It must contain the catalogue (catalogueFacts) and the concierge's rules.
 */
export function systemPrompt(): string {
  // TODO Step 1: return a string with the role, the catalogue and the rules.
  return todo('2-1', 'Step 1 (systemPrompt)');
}

/**
 * STEP 2 · Build the initial prompts: the system message first, then one
 * example question (role 'user') and the ideal answer (role 'assistant').
 */
export function initialPrompts():
  | LanguageModelMessage[]
  | [LanguageModelSystemMessage, ...LanguageModelMessage[]] {
  // TODO Step 2: return [system message, example user message, example assistant message].
  return todo('2-1', 'Step 2 (initialPrompts)');
}

/**
 * STEP 3 · Create the session.
 * Check that the API exists, check availability() with conciergeOptions,
 * then call LanguageModel.create() with the same options plus initialPrompts.
 */
export async function createConcierge(
  signal?: AbortSignal,
): Promise<LanguageModel> {
  // TODO Step 3: feature-detect, check availability, create the session.
  return todo('2-1', 'Step 3 (createConcierge)');
}

/**
 * STEP 4 · Ask a question in the existing session and return the answer.
 * Reusing the same session is what lets the model remember earlier turns.
 */
export async function ask(
  session: LanguageModel,
  question: string,
  signal?: AbortSignal,
): Promise<string> {
  // TODO Step 4: call session.prompt() with the question and the signal.
  return todo('2-1', 'Step 4 (ask)');
}

/**
 * STEP 5 · Release the session. A session holds memory on the device until
 * you destroy it. It must also be safe to call with `undefined`.
 */
export function closeConcierge(session: LanguageModel | undefined): void {
  // TODO Step 5: destroy the session if there is one.
  todo('2-1', 'Step 5 (closeConcierge)');
}
