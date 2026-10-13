import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../ai-runtime.service';
import { englishTaskOptions } from '../ai.types';
@Injectable({ providedIn: 'root' })
export class RewriterApi {
  private readonly runtime = inject(AiRuntime);

  async rewrite(
    text: string,
    tone: RewriterTone,
    signal: AbortSignal,
  ): Promise<string> {
    if (typeof Rewriter === 'undefined')
      throw new Error('Rewriter developer trial is unavailable.');
    // Rewriter starts from existing prose. tone changes how it is phrased;
    // sharedContext describes what must be preserved across the task. This guidance
    // can reduce invented content, but the viewer still needs to review the suggestion.
    const options: RewriterCreateOptions = {
      ...englishTaskOptions,
      tone,
      sharedContext:
        'Preserve the meaning of the supplied movie comment. Open movie means openly licensed film, not outdoor cinema. Do not invent events or viewing circumstances.',
      signal,
      monitor: this.runtime.downloadMonitor(signal),
    };
    await this.runtime.require('Rewriter', () =>
      Rewriter.availability(options),
    );
    const model = await Rewriter.create(options);
    try {
      signal.throwIfAborted();
      return await this.runtime.stream(
        model.rewriteStreaming(text, { signal }),
        signal,
      );
    } finally {
      // This is a one-shot model instance. Always destroy it when the task ends,
      // including cancellation or an exception, to release browser-managed resources.
      model.destroy();
    }
  }
}
