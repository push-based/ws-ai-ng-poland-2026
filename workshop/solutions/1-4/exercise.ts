// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1.4 · Progressive enhancement — SOLUTION
// Copy into place with: pnpm lab:solve 1-4
// ─────────────────────────────────────────────────────────────────────────────

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
  if (typeof Summarizer === 'undefined') return 'basic';
  try {
    const availability = await Summarizer.availability(summaryOptions);
    return availability === 'unavailable' ? 'basic' : 'ai';
  } catch {
    return 'basic';
  }
}

/**
 * STEP 2 · The non-AI version: the first `maxSentences` sentences of the text.
 * A sentence ends with . ! or ? — text without any of them is one sentence.
 */
export function basicExcerpt(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences
    .slice(0, maxSentences)
    .map((sentence) => sentence.trim())
    .join(' ');
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
  // 3a · The enhancement: only where the browser supports it.
  if ((await detectEnhancement()) === 'ai') {
    let summarizer: Summarizer | undefined;
    try {
      summarizer = await Summarizer.create({ ...summaryOptions, signal });
      const summary = await summarizer.summarize(text, { signal });
      return { source: 'ai', text: summary };
    } catch {
      // 3b · Any failure (download, quota, cancel…): fall through to basic.
    } finally {
      summarizer?.destroy();
    }
  }
  // 3c · The baseline: works in every browser.
  return { source: 'basic', text: basicExcerpt(text, 2) };
}
