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
      return await this.runtime.stream(
        model.writeStreaming(instruction, { signal }),
        signal,
      );
    } finally {
      model.destroy();
    }
  }
}
