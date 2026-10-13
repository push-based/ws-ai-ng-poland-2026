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
    // Summarizer is a task-specific API: type, length and format steer the result
    // without building our own chat prompt. preference is a performance hint, not
    // a guaranteed speed or quality level. Check and create with this same options set.
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
      // This is a one-shot model instance. Always destroy it when the task ends,
      // including cancellation or an exception, to release browser-managed resources.
      model.destroy();
    }
  }
}
