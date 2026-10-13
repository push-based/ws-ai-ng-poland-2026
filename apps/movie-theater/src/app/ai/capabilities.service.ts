import { Injectable, inject, signal } from '@angular/core';
import { AiRuntime } from './ai-runtime.service';
import {
  ApiName,
  Capability,
  englishPromptOptions,
  errorMessage,
} from './ai.types';
@Injectable({ providedIn: 'root' })
export class CapabilitiesService {
  private readonly runtime = inject(AiRuntime);
  readonly capabilities = signal<Capability[]>([]);

  // Checking an API has two stages: is the browser global exposed, and can its
  // availability() support the chosen languages/modality on this device? A present
  // global alone does not mean the model is ready. This screen checks capability;
  // model creation/download is a separate, explicit viewer action.
  async check() {
    const checks: {
      name: ApiName;
      check: () => Promise<Availability>;
      present: boolean;
      detail: string;
    }[] = [
      {
        name: 'Prompt',
        present: typeof LanguageModel !== 'undefined',
        check: () => LanguageModel.availability(englishPromptOptions),
        detail: 'English text → English text',
      },
      {
        name: 'Summarizer',
        present: typeof Summarizer !== 'undefined',
        check: () =>
          Summarizer.availability({
            expectedInputLanguages: ['en'],
            outputLanguage: 'en',
          }),
        detail: 'English programme notes',
      },
      {
        name: 'Translator',
        present: typeof Translator !== 'undefined',
        check: () =>
          Translator.availability({
            sourceLanguage: 'en',
            targetLanguage: 'pl',
          }),
        detail: 'English → Polish',
      },
      {
        name: 'LanguageDetector',
        present: typeof LanguageDetector !== 'undefined',
        check: () => LanguageDetector.availability(),
        detail: 'Text language detection',
      },
      {
        name: 'Writer',
        present: typeof Writer !== 'undefined',
        check: () =>
          Writer.availability({
            expectedInputLanguages: ['en'],
            outputLanguage: 'en',
          }),
        detail: 'Experimental · English',
      },
      {
        name: 'Rewriter',
        present: typeof Rewriter !== 'undefined',
        check: () =>
          Rewriter.availability({
            expectedInputLanguages: ['en'],
            outputLanguage: 'en',
          }),
        detail: 'Experimental · English',
      },
      {
        name: 'Proofreader',
        present: typeof Proofreader !== 'undefined',
        check: () => Proofreader.availability(),
        detail: 'Experimental',
      },
    ];
    // These checks are independent, so run them together. Catch each check separately:
    // one unsupported experimental API must not hide the results of the others.
    // Typical native states: unavailable, downloadable, downloading, and available.
    this.capabilities.set(
      await Promise.all(
        checks.map(async (item) => {
          try {
            return {
              name: item.name,
              state: item.present ? await item.check() : 'missing',
              detail: item.detail,
            } as Capability;
          } catch (error) {
            return {
              name: item.name,
              state: 'error',
              detail: errorMessage(error),
            } as Capability;
          }
        }),
      ),
    );
    this.runtime.trace(
      'Browser',
      'availability()',
      JSON.stringify(this.capabilities()),
    );
  }
}
