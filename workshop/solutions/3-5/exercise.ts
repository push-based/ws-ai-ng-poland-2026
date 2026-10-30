// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3.5 (bonus) · Writing assistance with human review — SOLUTION
// Copy into place with: pnpm lab:solve 3-5
//
// Writer, Rewriter and Proofreader are developer-trial / experimental APIs.
// They may be missing in your Chrome: then use the simulation switch.
// ─────────────────────────────────────────────────────────────────────────────

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
  if (typeof Writer === 'undefined')
    throw new Error(
      'The Writer API is not exposed by this browser (developer trial). Turn on the simulation.',
    );
  if ((await Writer.availability(writerOptions)) === 'unavailable')
    throw new Error('The Writer cannot run these options on this device.');

  const writer = await Writer.create({ ...writerOptions, signal });
  try {
    return await writer.write(notes, {
      // The notes are the viewer's material, not instructions: say what to keep.
      context:
        'Turn these rough notes into a short comment. Keep only the opinions the viewer wrote. Do not invent plot details, ratings or feelings.',
      signal,
    });
  } finally {
    writer.destroy();
  }
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
  const options: RewriterCreateOptions = {
    expectedInputLanguages: ['en'],
    outputLanguage: 'en',
    tone,
    sharedContext: commentContext,
  };
  if (typeof Rewriter === 'undefined')
    throw new Error(
      'The Rewriter API is not exposed by this browser (developer trial). Turn on the simulation.',
    );
  if ((await Rewriter.availability(options)) === 'unavailable')
    throw new Error('The Rewriter cannot run these options on this device.');

  const rewriter = await Rewriter.create({ ...options, signal });
  try {
    return await rewriter.rewrite(text, {
      context: 'Keep the meaning and every opinion of the original comment.',
      signal,
    });
  } finally {
    rewriter.destroy();
  }
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
  if (typeof Proofreader === 'undefined')
    throw new Error(
      'The Proofreader API is not exposed by this browser (developer trial). Turn on the simulation.',
    );
  if ((await Proofreader.availability(proofreaderOptions)) === 'unavailable')
    throw new Error('The Proofreader cannot run on this device.');

  const proofreader = await Proofreader.create({
    ...proofreaderOptions,
    signal,
  });
  try {
    const result = await proofreader.proofread(text, { signal });
    return {
      corrected: result.correctedInput,
      corrections: result.corrections.length,
    };
  } finally {
    proofreader.destroy();
  }
}
