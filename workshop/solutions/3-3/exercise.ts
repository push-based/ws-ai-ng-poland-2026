// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.3 · Summarizing documents larger than the context — SOLUTION
// Copy into place with: pnpm lab:solve 3-3
// ─────────────────────────────────────────────────────────────────────────────
import { movies } from '@nano-cinema/catalogue';

/** Given: one long document made of all three movies' notes and dialogue. */
export const longDocument = movies
  .map((movie) =>
    [
      `${movie.title} (${movie.year}), directed by ${movie.director}.`,
      ...movie.notes,
      movie.captions.length
        ? `Dialogue heard in the excerpt: ${movie.captions.map((cue) => cue.text.replace(/\s+/g, ' ')).join(' ')}`
        : 'The excerpt has no spoken dialogue.',
    ].join('\n\n'),
  )
  .join('\n\n');

/** Map step: every chunk becomes a few short key points. */
export const chunkOptions: SummarizerCreateOptions = {
  expectedInputLanguages: ['en'],
  outputLanguage: 'en',
  type: 'key-points',
  length: 'short',
  format: 'plain-text',
};

/** Final step: one paragraph about the whole document. */
export const finalOptions: SummarizerCreateOptions = {
  expectedInputLanguages: ['en'],
  outputLanguage: 'en',
  type: 'tldr',
  length: 'medium',
  format: 'plain-text',
  sharedContext:
    'Programme notes of three open movies shown by a small cinema.',
};

/** English averages about 4 characters per token. We plan with 3 to stay on the safe side. */
export const charsPerToken = 3;

/** Give up after this many rounds, so a summary that does not shrink cannot loop forever. */
export const maxRounds = 4;

/** One line of the page's trace: what happened and a short detail. */
export interface Stage {
  name: string;
  detail: string;
}

/** How much of the input quota a text would use. */
export interface InputBudget {
  usage: number;
  quota: number;
  fits: boolean;
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

/** Given: split a paragraph into sentences with Intl.Segmenter, the built-in sentence splitter. */
export function sentencesOf(text: string): string[] {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  return [...segmenter.segment(text)]
    .map((part) => part.segment.trim())
    .filter(Boolean);
}

/**
 * Given: join neighbouring parts with `separator` into groups of at most
 * maxChars. A part is never cut; a single part longer than maxChars becomes
 * a group of its own.
 */
export function pack(
  parts: string[],
  separator: string,
  maxChars: number,
): string[] {
  const groups: string[] = [];
  let current = '';
  for (const part of parts) {
    const candidate = current ? current + separator + part : part;
    if (current && candidate.length > maxChars) {
      groups.push(current);
      current = part;
    } else current = candidate;
  }
  if (current) groups.push(current);
  return groups;
}

/**
 * STEP 1 · Does the text fit?
 * Measure the text with summarizer.measureInputUsage() and compare it with
 * the quota (by default summarizer.inputQuota). Return usage, quota and fits.
 */
export async function fitsInQuota(
  summarizer: Summarizer,
  text: string,
  quota = summarizer.inputQuota,
  signal?: AbortSignal,
): Promise<InputBudget> {
  // measureInputUsage() counts tokens the way this model does. Never guess from characters.
  const usage = await summarizer.measureInputUsage(text, { signal });
  return { usage, quota, fits: usage <= quota };
}

/**
 * STEP 2 · Split the text into chunks of at most maxChars characters.
 * Keep whole paragraphs together when they fit. A paragraph that is too long
 * falls back to sentences, and a very long sentence to whole words. Never cut a word.
 */
export function splitIntoChunks(text: string, maxChars: number): string[] {
  // 2a · Paragraphs are the natural boundaries: a blank line separates them.
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // 2b · Keep a paragraph whole when it fits; otherwise fall back to sentences,
  //      and for a very long sentence to groups of whole words.
  const pieces = paragraphs.flatMap((paragraph) => {
    if (paragraph.length <= maxChars) return [paragraph];
    const sentences = sentencesOf(paragraph).flatMap((sentence) =>
      sentence.length <= maxChars
        ? [sentence]
        : pack(sentence.split(/\s+/), ' ', maxChars),
    );
    return pack(sentences, ' ', maxChars);
  });

  // 2c · Put neighbouring pieces together, so each chunk is as full as possible.
  return pack(pieces, '\n\n', maxChars);
}

/**
 * STEP 3 · The "map" step: summarize every chunk, one after the other.
 * Report each summary with onStage and return them in the original order.
 */
export async function summarizeEach(
  summarizer: Summarizer,
  chunks: string[],
  onStage: (stage: Stage) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  const summaries: string[] = [];
  for (const [index, chunk] of chunks.entries()) {
    signal?.throwIfAborted();
    const summary = await summarizer.summarize(chunk, { signal });
    summaries.push(summary);
    onStage({
      name: `Chunk ${index + 1} of ${chunks.length}`,
      detail: summary,
    });
  }
  return summaries;
}

/**
 * STEP 4 · The whole pipeline (map-reduce).
 * While the text does not fit: split it, summarize each chunk with
 * chunkOptions and join the summaries. When it fits, write the final summary
 * with finalOptions. quotaOverride pretends the quota is smaller than it is.
 * Destroy every summarizer you create.
 */
export async function summarizeLarge(
  text: string,
  onStage: (stage: Stage) => void,
  signal?: AbortSignal,
  quotaOverride?: number,
): Promise<string> {
  // 4a · Map/reduce rounds with the key-points summarizer.
  let current = text;
  const mapper = await createSummarizer(chunkOptions, signal);
  try {
    // A smaller pretend quota lets you watch the chunking even when the real quota is large.
    const quota = Math.min(mapper.inputQuota, quotaOverride ?? Infinity);
    const maxChars = quota * charsPerToken;
    for (let round = 1; ; round++) {
      const budget = await fitsInQuota(mapper, current, quota, signal);
      onStage({
        name: `Round ${round} · measure`,
        detail: `${budget.usage} of ${budget.quota} tokens: ${budget.fits ? 'fits' : 'too large'}`,
      });
      if (budget.fits) break;
      if (round > maxRounds)
        throw new Error(
          `The text is still too large after ${maxRounds} rounds.`,
        );
      const chunks = splitIntoChunks(current, maxChars);
      onStage({
        name: `Round ${round} · split`,
        detail: `${chunks.length} chunks of at most ${maxChars} characters`,
      });
      const summaries = await summarizeEach(mapper, chunks, onStage, signal);
      // The next round works on the summaries, not on the original text.
      current = summaries.join('\n\n');
    }
  } finally {
    mapper.destroy();
  }

  // 4b · The text fits now: one final summary with a different summarizer.
  const finisher = await createSummarizer(finalOptions, signal);
  try {
    const summary = await finisher.summarize(current, { signal });
    onStage({
      name: 'Final summary',
      detail: `${current.length} characters in, ${summary.length} out`,
    });
    return summary;
  } finally {
    finisher.destroy();
  }
}
