import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../ai-runtime.service';
@Injectable({ providedIn: 'root' })
export class TranslatorApi {
  private readonly runtime = inject(AiRuntime);

  async translate(
    text: string,
    source: string,
    target: string,
    signal: AbortSignal,
  ): Promise<string> {
    return (await this.translateMany([text], source, target, signal))[0];
  }

  /** Reuse one translator for a caption batch without changing the supplied cue timings. */
  async translateMany(
    texts: readonly string[],
    sourceLanguage: string,
    targetLanguage: string,
    signal: AbortSignal,
  ): Promise<string[]> {
    if (sourceLanguage === targetLanguage) return [...texts];
    if (typeof Translator === 'undefined')
      throw new Error('Translator API is not exposed.');
    const options = {
      sourceLanguage,
      targetLanguage,
      signal,
      monitor: this.runtime.downloadMonitor(signal),
    };
    this.runtime.trace(
      'Translator',
      'language pair',
      JSON.stringify({ sourceLanguage, targetLanguage }),
    );
    await this.runtime.require('Translator', () =>
      Translator.availability(options),
    );
    const model = await Translator.create(options);
    try {
      const translated: string[] = [];
      for (const text of texts) {
        signal.throwIfAborted();
        translated.push(await model.translate(text, { signal }));
      }
      return translated;
    } finally {
      model.destroy();
    }
  }
}
