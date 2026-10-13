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
    // Translation models are selected by source/target language pair. Preparing
    // English-to-Polish does not establish support for every other pair. We check
    // this exact pair each time we create a translator; no cloud service is called.
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
      // Reuse the same translator for the batch and keep cue order intact. Each
      // input text produces one output text; timestamps live elsewhere and are never
      // sent to the model. Sequential calls make cancellation between cues explicit.
      for (const text of texts) {
        signal.throwIfAborted();
        translated.push(await model.translate(text, { signal }));
      }
      return translated;
    } finally {
      // This is a one-shot model instance. Always destroy it when the task ends,
      // including cancellation or an exception, to release browser-managed resources.
      model.destroy();
    }
  }
}
