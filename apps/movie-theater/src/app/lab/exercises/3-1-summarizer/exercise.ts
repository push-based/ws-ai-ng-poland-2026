/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.1 · The Summarizer API
// Guide: workshop/exercises/3-1-summarizer.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/3-1 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 3-1
// ─────────────────────────────────────────────────────────────────────────────
import type { Movie } from '@nano-cinema/catalogue';
import { todo } from '../../shared/todo';

/** The text we summarize: every programme note of one movie, separated by blank lines. */
export function programmeNotes(movie: Movie): string {
  return movie.notes.join('\n\n');
}

/** Our notes are English and we want an English summary. */
export const englishLanguages: SummarizerCreateCoreOptions = {
  expectedInputLanguages: ['en'],
  outputLanguage: 'en',
};

/** What the page shows when the Summarizer global does not exist at all. */
export type SummarizerSupport = Availability | 'missing';

/**
 * STEP 1 · Describe the summary you want.
 * Return englishLanguages plus type, length and format. Add sharedContext
 * only when the caller gave one (an empty string means "no shared context").
 */
export function summaryOptions(
  type: SummarizerType,
  length: SummarizerLength,
  format: SummarizerFormat,
  sharedContext?: string,
): SummarizerCreateOptions {
  // TODO Step 1: return an options object for these settings.
  return todo('3-1', 'Step 1 (summaryOptions)');
}

/**
 * STEP 2 · Can this device summarize with these exact options?
 * Return 'missing' when the browser has no Summarizer at all, otherwise the
 * answer of Summarizer.availability(options).
 */
export async function summarizerAvailability(
  options: SummarizerCreateOptions,
): Promise<SummarizerSupport> {
  // TODO Step 2: feature-detect Summarizer, then ask availability(options).
  return todo('3-1', 'Step 2 (summarizerAvailability)');
}

/**
 * STEP 3 · Create a summarizer.
 * Use summarizerAvailability() first and throw a readable Error when it is
 * 'missing' or 'unavailable'. Then call Summarizer.create() with the same
 * options plus the signal, and report download progress (0..1) to onProgress.
 */
export async function createSummarizer(
  options: SummarizerCreateOptions,
  signal?: AbortSignal,
  onProgress?: (loaded: number) => void,
): Promise<Summarizer> {
  // TODO Step 3: check support, then create the summarizer with a download monitor.
  return todo('3-1', 'Step 3 (createSummarizer)');
}

/**
 * STEP 4 · Summarize one text and clean up.
 * Create a summarizer, call summarize() with the optional per-request context
 * and the signal, and ALWAYS destroy the summarizer afterwards (also on errors).
 */
export async function summarize(
  text: string,
  options: SummarizerCreateOptions,
  signal?: AbortSignal,
  context?: string,
  onProgress?: (loaded: number) => void,
): Promise<string> {
  // TODO Step 4: create, summarize, destroy in finally.
  return todo('3-1', 'Step 4 (summarize)');
}
