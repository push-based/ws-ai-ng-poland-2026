/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1.4 · Progressive enhancement
// Guide: workshop/exercises/1-4-progressive-enhancement.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/1-4 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 1-4
// ─────────────────────────────────────────────────────────────────────────────
import { todo } from '../../shared/todo';

/** A one-paragraph, plain-text summary of English programme notes. */
export const summaryOptions: SummarizerCreateCoreOptions = {
  type: 'tldr',
  length: 'short',
  format: 'plain-text',
  expectedInputLanguages: ['en'],
  outputLanguage: 'en',
};

/** 'ai' = the enhanced version, 'basic' = the version that works everywhere. */
export type Enhancement = 'ai' | 'basic';

export interface ShortDescription {
  source: Enhancement;
  text: string;
}

/**
 * STEP 1 · Can this browser offer the AI version? Return 'ai' only when the
 * Summarizer is exposed AND availability(summaryOptions) is not 'unavailable'.
 * Anything else, including an error, means 'basic'.
 */
export async function detectEnhancement(): Promise<Enhancement> {
  // TODO Step 1: typeof Summarizer, then Summarizer.availability(summaryOptions).
  return todo('1-4', 'Step 1 (detectEnhancement)');
}

/**
 * STEP 2 · The non-AI version: the first `maxSentences` sentences of the text.
 * A sentence ends with . ! or ? — text without any of them is one sentence.
 */
export function basicExcerpt(text: string, maxSentences: number): string {
  // TODO Step 2: split into sentences, keep the first maxSentences.
  return todo('1-4', 'Step 2 (basicExcerpt)');
}

/**
 * STEP 3 · The feature itself. Try the AI summary when detectEnhancement()
 * says 'ai'. If anything goes wrong, or there is no AI, return the excerpt
 * of the first two sentences. Always destroy the summarizer you created.
 */
export async function shortDescription(
  text: string,
  signal?: AbortSignal,
): Promise<ShortDescription> {
  // TODO Step 3: try Summarizer (try/catch/finally), fall back to basicExcerpt().
  return todo('1-4', 'Step 3 (shortDescription)');
}
