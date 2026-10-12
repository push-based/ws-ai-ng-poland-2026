export type AiMode = 'native' | 'fixture';
export type ApiName =
  | 'Prompt'
  | 'Summarizer'
  | 'Translator'
  | 'LanguageDetector'
  | 'Writer'
  | 'Rewriter'
  | 'Proofreader';
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
export const englishPromptOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};
export const englishTaskOptions = {
  expectedInputLanguages: ['en'],
  outputLanguage: 'en',
};
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
