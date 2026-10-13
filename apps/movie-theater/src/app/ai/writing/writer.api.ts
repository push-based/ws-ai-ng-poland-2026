import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../ai-runtime.service';
import { englishTaskOptions } from '../ai.types';
@Injectable({ providedIn: 'root' })
export class WriterApi {
  private readonly runtime = inject(AiRuntime);

  async write(instruction: string, signal: AbortSignal): Promise<string> {
    if (typeof Writer === 'undefined')
      throw new Error('Writer developer trial is unavailable.');
    const options = {
      ...englishTaskOptions,
      signal,
      monitor: this.runtime.downloadMonitor(signal),
    };
    await this.runtime.require('Writer', () => Writer.availability(options));
    const model = await Writer.create(options);
    try {
      signal.throwIfAborted();
      // Writer turns the supplied rough notes/instruction into new prose. It returns
      // streamed text, not a saved comment. The feature previews that text and leaves
      // acceptance and persistence to separate viewer actions.
      return await this.runtime.stream(
        model.writeStreaming(instruction, { signal }),
        signal,
      );
    } finally {
      // This is a one-shot model instance. Always destroy it when the task ends,
      // including cancellation or an exception, to release browser-managed resources.
      model.destroy();
    }
  }
}
