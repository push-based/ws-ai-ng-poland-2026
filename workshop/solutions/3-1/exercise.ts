// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.1 · The Summarizer API — SOLUTION
// Copy into place with: pnpm lab:solve 3-1
// ─────────────────────────────────────────────────────────────────────────────
import type { Movie } from '@nano-cinema/catalogue';

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
  const options: SummarizerCreateOptions = {
    ...englishLanguages,
    type,
    length,
    format,
  };
  if (sharedContext?.trim()) options.sharedContext = sharedContext.trim();
  return options;
}

/**
 * STEP 2 · Can this device summarize with these exact options?
 * Return 'missing' when the browser has no Summarizer at all, otherwise the
 * answer of Summarizer.availability(options).
 */
export async function summarizerAvailability(
  options: SummarizerCreateOptions,
): Promise<SummarizerSupport> {
  if (typeof Summarizer === 'undefined') return 'missing';
  return Summarizer.availability(options);
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
  const support = await summarizerAvailability(options);
  if (support === 'missing')
    throw new Error(
      'The Summarizer API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if (support === 'unavailable')
    throw new Error(
      'The Summarizer cannot run these options (languages, type, format) on this device.',
    );

  return Summarizer.create({
    ...options,
    signal,
    // The monitor reports model download progress as a number from 0 to 1.
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) =>
        onProgress?.(event.loaded),
      );
    },
  });
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
  const summarizer = await createSummarizer(options, signal, onProgress);
  try {
    return await summarizer.summarize(text, {
      context: context?.trim() || undefined,
      signal,
    });
  } finally {
    // One summarizer per request: release the model even when summarize() failed.
    summarizer.destroy();
  }
}
