/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1.2 · Feature and capability detection
// Guide: workshop/exercises/1-2-feature-detection.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/1-2 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 1-2
// ─────────────────────────────────────────────────────────────────────────────
import { todo } from '../../shared/todo';

/** The browser globals of Chrome's built-in AI APIs. */
export const aiGlobals = [
  'LanguageModel',
  'Summarizer',
  'Translator',
  'LanguageDetector',
  'Writer',
  'Rewriter',
  'Proofreader',
] as const;

export type AiGlobal = (typeof aiGlobals)[number];

/** availability() answers, plus our own 'missing' and 'error'. */
export type CheckStatus = Availability | 'missing' | 'error';

/** One row of the capability matrix. */
export interface ApiCheck {
  api: AiGlobal;
  status: CheckStatus;
  detail: string;
}

/** A check that has not run yet: which API, which options, and how to ask. */
export interface AvailabilityCheck {
  api: AiGlobal;
  detail: string;
  check: () => Promise<Availability>;
}

/** The Prompt API options for plain English text, as the cinema concierge uses. */
export const textPromptOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/**
 * GIVEN · The task APIs, with the same options as the cinema's AI Inspector.
 * `check` is a function, so nothing runs until someone calls it.
 */
export const taskChecks: AvailabilityCheck[] = [
  {
    api: 'Summarizer',
    detail: 'English programme notes',
    check: () =>
      Summarizer.availability({
        expectedInputLanguages: ['en'],
        outputLanguage: 'en',
      }),
  },
  {
    api: 'LanguageDetector',
    detail: 'Text language detection',
    check: () => LanguageDetector.availability(),
  },
  {
    api: 'Writer',
    detail: 'Experimental · English',
    check: () =>
      Writer.availability({
        expectedInputLanguages: ['en'],
        outputLanguage: 'en',
      }),
  },
  {
    api: 'Rewriter',
    detail: 'Experimental · English',
    check: () =>
      Rewriter.availability({
        expectedInputLanguages: ['en'],
        outputLanguage: 'en',
      }),
  },
  {
    api: 'Proofreader',
    detail: 'Experimental',
    check: () => Proofreader.availability(),
  },
];

/**
 * STEP 1 · Feature detection: does this browser expose a global with this name?
 * It must never throw, even for a name that does not exist.
 */
export function isExposed(name: string): boolean {
  // TODO Step 1: look the name up on globalThis with typeof.
  return todo('1-2', 'Step 1 (isExposed)');
}

/**
 * STEP 2 · Run one availability check safely. Return 'missing' when the API
 * is not exposed, the availability() answer when it is, and 'error' (with the
 * error message as detail) when the check throws. Never reject.
 */
export async function checkApi(
  api: AiGlobal,
  detail: string,
  check: () => Promise<Availability>,
): Promise<ApiCheck> {
  // TODO Step 2: isExposed() first, then await check() inside try/catch.
  return todo('1-2', 'Step 2 (checkApi)');
}

/**
 * STEP 3 · The Prompt API needs TWO checks: text only, and text + image.
 * The same API can be ready for one configuration and not for the other.
 */
export function promptChecks(): AvailabilityCheck[] {
  // TODO Step 3: return two AvailabilityCheck objects for 'LanguageModel'.
  return todo('1-2', 'Step 3 (promptChecks)');
}

/**
 * STEP 4 · Translator models exist per language PAIR. Build the check for the
 * pair the user picked.
 */
export function translatorCheck(
  sourceLanguage: string,
  targetLanguage: string,
): AvailabilityCheck {
  // TODO Step 4: return one AvailabilityCheck for 'Translator'.
  return todo('1-2', 'Step 4 (translatorCheck)');
}

/**
 * STEP 5 · Run every check at the same time (Promise.all) and return one row
 * per check: the two Prompt checks, the translator pair, then taskChecks.
 */
export async function checkAll(
  sourceLanguage: string,
  targetLanguage: string,
): Promise<ApiCheck[]> {
  // TODO Step 5: collect all checks, run them with checkApi() in Promise.all.
  return todo('1-2', 'Step 5 (checkAll)');
}
