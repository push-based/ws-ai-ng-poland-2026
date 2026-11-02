// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.4 (bonus) · Translating subtitles — SOLUTION
// Copy into place with: pnpm lab:solve 3-4
// ─────────────────────────────────────────────────────────────────────────────
import type { Cue } from '@nano-cinema/catalogue';

/** The subtitle languages the page offers. Our dialogue is English ('en'). */
export const targetLanguages = [
  { code: 'pl', label: 'Polish' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
];

/** The best guess of a language detector. 'und' means "undetermined". */
export interface DetectedLanguage {
  language: string;
  confidence: number;
}

/** What the page shows for a language pair. 'missing' = no Translator API at all. */
export type TranslationSupport = Availability | 'missing';

/**
 * STEP 1 · Which language is this text in?
 * Feature-detect LanguageDetector, check availability(), create a detector,
 * detect() the text and return the FIRST (most likely) result. Return
 * { language: 'und', confidence: 0 } when there is no result. Destroy the detector.
 */
export async function detectLanguage(
  text: string,
  signal?: AbortSignal,
): Promise<DetectedLanguage> {
  if (typeof LanguageDetector === 'undefined')
    throw new Error(
      'The Language Detector API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if ((await LanguageDetector.availability()) === 'unavailable')
    throw new Error('Language detection is unavailable on this device.');

  const detector = await LanguageDetector.create({ signal });
  try {
    // detect() returns guesses sorted from most to least likely: take the first.
    const [best] = await detector.detect(text, { signal });
    return {
      language: best?.detectedLanguage ?? 'und',
      confidence: best?.confidence ?? 0,
    };
  } finally {
    detector.destroy();
  }
}

/**
 * STEP 2 · Can this device translate from `source` to `target`?
 * Return 'missing' when there is no Translator API, otherwise the answer of
 * Translator.availability() for exactly this language pair.
 */
export async function canTranslate(
  source: string,
  target: string,
): Promise<TranslationSupport> {
  if (typeof Translator === 'undefined') return 'missing';
  return Translator.availability({
    sourceLanguage: source,
    targetLanguage: target,
  });
}

/**
 * STEP 3 · Translate subtitle cues.
 * Return NEW cues with the same start and end times and translated text.
 * Return copies without a model when there is nothing to do (no cues, or
 * source === target). Otherwise create ONE translator for all cues, translate
 * them in order, report onProgress(done, total) and destroy it at the end.
 */
export async function translateCues(
  cues: readonly Cue[],
  source: string,
  target: string,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Cue[]> {
  // 3a · Nothing to translate: return copies and do not create (or download) a model.
  if (cues.length === 0 || source === target)
    return cues.map((cue) => ({ ...cue }));

  // 3b · Check this exact language pair (Step 2) before creating a translator.
  const support = await canTranslate(source, target);
  if (support === 'missing')
    throw new Error(
      'The Translator API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if (support === 'unavailable')
    throw new Error(
      `Translating ${source} → ${target} is unavailable on this device.`,
    );

  // 3c · ONE translator for all cues, translated in order.
  const translator = await Translator.create({
    sourceLanguage: source,
    targetLanguage: target,
    signal,
  });
  try {
    const translated: Cue[] = [];
    for (const cue of cues) {
      signal?.throwIfAborted();
      const text = await translator.translate(cue.text, { signal });
      // Only the text changes: start and end stay exactly as they were.
      translated.push({ ...cue, text });
      onProgress?.(translated.length, cues.length);
    }
    return translated;
  } finally {
    translator.destroy();
  }
}
