import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../ai-runtime.service';
@Injectable({ providedIn: 'root' })
export class ProofreaderApi {
  private readonly runtime = inject(AiRuntime);

  async proofread(text: string, signal: AbortSignal): Promise<string> {
    if (typeof Proofreader === 'undefined')
      throw new Error('Proofreader developer trial is unavailable.');
    await this.runtime.require('Proofreader', () => Proofreader.availability());
    const model = await Proofreader.create({
      signal,
      monitor: this.runtime.downloadMonitor(signal),
    });
    try {
      signal.throwIfAborted();
      const result = await model.proofread(text, { signal });
      this.runtime.trace('Proofreader', 'corrections', JSON.stringify(result));
      return result.correctedInput;
    } finally {
      model.destroy();
    }
  }
}
