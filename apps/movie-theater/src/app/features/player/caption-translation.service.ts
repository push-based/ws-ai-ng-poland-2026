import { Injectable, inject } from '@angular/core';
import { Movie } from '@nano-cinema/catalogue';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { TranslatorApi } from '../../ai/language/translator.api';
import { fixtureCaptions } from '../../ai/fixtures';
@Injectable({ providedIn: 'root' })
export class CaptionTranslationService {
  private readonly runtime = inject(AiRuntime);
  private readonly translator = inject(TranslatorApi);
  private readonly cache = new Map<string, string[]>();

  // Translate only cue text, preserving its array order. The player still uses
  // the original start/end times to choose which translated string to display.
  // Translation cannot create speech or meaningful captions for a silent excerpt.
  translate(
    movie: Movie,
    language: string,
    externalSignal?: AbortSignal,
  ): Promise<string[]> {
    return this.runtime.run(
      'Translator',
      `translate cues en → ${language}`,
      async (signal) => {
        if (this.runtime.mode() === 'fixture')
          return fixtureCaptions(movie, language);
        const original = movie.captions.map((cue) => cue.text);
        if (language === 'en') return original;
        // Cache only successful native translations. Fixture outputs never enter this cache.
        const key = `${movie.id}:${language}`;
        const cached = this.cache.get(key);
        if (cached) return cached;
        const translated = await this.translator.translateMany(
          original,
          'en',
          language,
          signal,
        );
        signal.throwIfAborted();
        this.cache.set(key, translated);
        return translated;
      },
      externalSignal,
    );
  }
}
