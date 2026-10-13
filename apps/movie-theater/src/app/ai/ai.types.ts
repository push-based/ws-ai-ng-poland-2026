// Two explicit execution modes: native calls real browser-managed models; fixture
// uses predictable examples. A native failure is never silently replaced by a fixture.
export type AiMode = 'native' | 'fixture';
export type ApiName =
  | 'Prompt'
  | 'Summarizer'
  | 'Translator'
  | 'LanguageDetector'
  | 'Writer'
  | 'Rewriter'
  | 'Proofreader';
// Availability describes one task configuration, not a promise that every use of
// that API works. 'missing' means the global is absent; 'error' means the check failed.
export interface Capability {
  name: ApiName;
  state: Availability | 'missing' | 'error';
  detail: string;
}
export interface Trace {
  api: string;
  operation: string;
  detail: string;
  time: string;
}
export interface DetectedLanguage {
  language: string;
  confidence: number;
}
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}
export interface SummaryOptions {
  type: SummarizerType;
  length: SummarizerLength;
  format: SummarizerFormat;
  preference: PerformancePreference;
}
export const defaultSummaryOptions: SummaryOptions = {
  type: 'teaser',
  length: 'short',
  format: 'plain-text',
  preference: 'auto',
};
// Declare the modalities and languages before creating the Prompt session. The
// concierge uses English text; its translation pipeline handles other request languages.
// Image description supplies different expectedInputs and needs a separate check.
export const englishPromptOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};
// The task-specific writing/summarizing APIs use a different option vocabulary
// from LanguageModel. Keep these declarations aligned with the text we actually send.
export const englishTaskOptions = {
  expectedInputLanguages: ['en'],
  outputLanguage: 'en',
};
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
