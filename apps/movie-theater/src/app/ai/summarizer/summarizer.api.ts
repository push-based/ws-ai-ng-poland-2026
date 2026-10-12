import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../ai-runtime.service';
import { SummaryOptions, englishTaskOptions } from '../ai.types';
@Injectable({ providedIn: 'root' })
/** A short-lived native summarizer. Feature orchestration chooses source text and chunk boundaries. */
export class SummarizerApi {
  private readonly runtime = inject(AiRuntime);

  async summarize(
    text: string,
    configuration: SummaryOptions,
    signal: AbortSignal,
  ): Promise<string> {
    if (typeof Summarizer === 'undefined')
      throw new Error('Summarizer API is not exposed.');
    this.runtime.trace(
      'Summarizer',
      'configuration',
      JSON.stringify(configuration),
    );
    const options: SummarizerCreateOptions = {
      ...englishTaskOptions,
      ...configuration,
      signal,
      monitor: this.runtime.downloadMonitor(signal),
    };
    await this.runtime.require('Summarizer', () =>
      Summarizer.availability(options),
    );
    const model = await Summarizer.create(options);
    try {
      signal.throwIfAborted();
      return await this.runtime.stream(
        model.summarizeStreaming(text, { signal }),
        signal,
      );
    } finally {
      model.destroy();
    }
  }
}
