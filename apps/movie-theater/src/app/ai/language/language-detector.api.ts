import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../ai-runtime.service';
import { DetectedLanguage } from '../ai.types';
@Injectable({ providedIn: 'root' })
export class LanguageDetectorApi {
  private readonly runtime = inject(AiRuntime);

  async detect(text: string, signal: AbortSignal): Promise<DetectedLanguage> {
    if (typeof LanguageDetector === 'undefined')
      throw new Error(
        'Language Detector is unavailable. Select a request language explicitly or use demo fixtures.',
      );
    await this.runtime.require('LanguageDetector', () =>
      LanguageDetector.availability(),
    );
    const model = await LanguageDetector.create({
      signal,
      monitor: this.runtime.downloadMonitor(signal),
    });
    try {
      signal.throwIfAborted();
      // Detection returns ranked language guesses and confidence values. We choose
      // the first result; 'und' means undetermined if no guess was returned. Confidence
      // is model output, not certainty, especially for short or ambiguous requests.
      const results = await model.detect(text, { signal });
      return {
        language: results[0]?.detectedLanguage ?? 'und',
        confidence: results[0]?.confidence ?? 0,
      };
    } finally {
      // This is a one-shot model instance. Always destroy it when the task ends,
      // including cancellation or an exception, to release browser-managed resources.
      model.destroy();
    }
  }
}
