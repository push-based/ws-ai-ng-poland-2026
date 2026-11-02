/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.4 (bonus) · Translating subtitles
// Guide: workshop/exercises/3-4-translation.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/3-4 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 3-4
// ─────────────────────────────────────────────────────────────────────────────
import type { Cue } from '@nano-cinema/catalogue';
import { todo } from '../../shared/todo';

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
  // TODO Step 1: feature-detect, availability, create, detect, destroy in finally.
  return todo('3-4', 'Step 1 (detectLanguage)');
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
  // TODO Step 2: feature-detect Translator, then ask availability for this pair.
  return todo('3-4', 'Step 2 (canTranslate)');
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
  // TODO Step 3: one translator, translate only the text, keep start/end.
  return todo('3-4', 'Step 3 (translateCues)');
}
