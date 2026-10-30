/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.5 (bonus) · Writing assistance with human review
// Guide: workshop/exercises/3-5-writing-assistance.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/3-5 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 3-5
//
// Writer, Rewriter and Proofreader are developer-trial / experimental APIs.
// They may be missing in your Chrome: then use the simulation switch.
// ─────────────────────────────────────────────────────────────────────────────
import { todo } from '../../shared/todo';

/** Background that applies to every request: what kind of text we are working on. */
export const commentContext =
  'Short viewer comments about open movies shown by Nano Cinema, a small local cinema. "Open movie" means an openly licensed film, not an outdoor screening.';

/** Rough notes a viewer might type, with typos. */
export const exampleNotes =
  'realy loved teh dragon scenes, music was beautifull, ending felt a bit rushed';

/** Writer: a short, neutral, plain-text comment in English. */
export const writerOptions: WriterCreateOptions = {
  expectedInputLanguages: ['en'],
  outputLanguage: 'en',
  tone: 'neutral',
  length: 'short',
  format: 'plain-text',
  sharedContext: commentContext,
};

/** Proofreader: we proofread English text. */
export const proofreaderOptions: ProofreaderCreateCoreOptions = {
  expectedInputLanguages: ['en'],
};

/** What proofreadComment() returns to the page. */
export interface ProofreadSuggestion {
  corrected: string;
  corrections: number;
}

/**
 * STEP 1 · Turn rough notes into a comment (Writer).
 * Feature-detect Writer, check availability(writerOptions), create it with the
 * same options plus the signal, write() and destroy it at the end. Send the
 * notes as the input and tell the model, in `context`, to keep only the
 * viewer's own opinions.
 */
export async function writeComment(
  notes: string,
  signal?: AbortSignal,
): Promise<string> {
  // TODO Step 1: feature-detect, availability, create, write, destroy in finally.
  return todo('3-5', 'Step 1 (writeComment)');
}

/**
 * STEP 2 · Change the tone of a comment (Rewriter).
 * Same routine as Step 1 with Rewriter. The tone ('as-is', 'more-formal',
 * 'more-casual') is a create() option, so build the options first.
 */
export async function rewriteComment(
  text: string,
  tone: RewriterTone,
  signal?: AbortSignal,
): Promise<string> {
  // TODO Step 2: build options with the tone, then the same routine with Rewriter.
  return todo('3-5', 'Step 2 (rewriteComment)');
}

/**
 * STEP 3 · Fix spelling and grammar (Proofreader).
 * Same routine with Proofreader and proofreaderOptions. proofread() returns
 * { correctedInput, corrections }: return the corrected text and the NUMBER of corrections.
 */
export async function proofreadComment(
  text: string,
  signal?: AbortSignal,
): Promise<ProofreadSuggestion> {
  // TODO Step 3: the same routine with Proofreader; count the corrections.
  return todo('3-5', 'Step 3 (proofreadComment)');
}
