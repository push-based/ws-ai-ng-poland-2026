// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1.2 · Feature and capability detection — SOLUTION
// Copy into place with: pnpm lab:solve 1-2
// ─────────────────────────────────────────────────────────────────────────────

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
  return typeof (globalThis as Record<string, unknown>)[name] !== 'undefined';
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
  // 2a · Feature detection first: never call a missing API.
  if (!isExposed(api)) return { api, detail, status: 'missing' };
  try {
    // 2b · Capability check: can this device run THESE options?
    return { api, detail, status: await check() };
  } catch (error) {
    // 2c · A failing check becomes a row, not a crash.
    const message = error instanceof Error ? error.message : String(error);
    return { api, detail: message, status: 'error' };
  }
}

/**
 * STEP 3 · The Prompt API needs TWO checks: text only, and text + image.
 * The same API can be ready for one configuration and not for the other.
 */
export function promptChecks(): AvailabilityCheck[] {
  return [
    {
      api: 'LanguageModel',
      detail: 'English text → English text',
      check: () => LanguageModel.availability(textPromptOptions),
    },
    {
      api: 'LanguageModel',
      detail: 'English text + image → English text',
      check: () =>
        LanguageModel.availability({
          ...textPromptOptions,
          expectedInputs: [
            { type: 'text', languages: ['en'] },
            { type: 'image' },
          ],
        }),
    },
  ];
}

/**
 * STEP 4 · Translator models exist per language PAIR. Build the check for the
 * pair the user picked.
 */
export function translatorCheck(
  sourceLanguage: string,
  targetLanguage: string,
): AvailabilityCheck {
  return {
    api: 'Translator',
    detail: `${sourceLanguage} → ${targetLanguage}`,
    check: () => Translator.availability({ sourceLanguage, targetLanguage }),
  };
}

/**
 * STEP 5 · Run every check at the same time (Promise.all) and return one row
 * per check: the two Prompt checks, the translator pair, then taskChecks.
 */
export async function checkAll(
  sourceLanguage: string,
  targetLanguage: string,
): Promise<ApiCheck[]> {
  const checks = [
    ...promptChecks(),
    translatorCheck(sourceLanguage, targetLanguage),
    ...taskChecks,
  ];
  return Promise.all(
    checks.map(({ api, detail, check }) => checkApi(api, detail, check)),
  );
}
