import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../ai-runtime.service';
import { englishPromptOptions } from '../ai.types';
/** The caller owns returned conversational sessions and must destroy them. */
@Injectable({ providedIn: 'root' })
export class PromptApi {
  private readonly runtime = inject(AiRuntime);

  async create(
    signal: AbortSignal,
    initialPrompts: NonNullable<
      LanguageModelCreateOptions['initialPrompts']
    > = [],
    options: LanguageModelCreateCoreOptions = englishPromptOptions,
  ): Promise<LanguageModel> {
    if (typeof LanguageModel === 'undefined')
      throw new Error('Prompt API is not exposed by this browser.');
    await this.runtime.require('Prompt', () =>
      LanguageModel.availability(options),
    );
    const session = await LanguageModel.create({
      ...options,
      signal,
      monitor: this.runtime.downloadMonitor(signal),
      initialPrompts,
    });
    // A browser implementation can resolve creation after cancellation. Release that model immediately.
    if (signal.aborted) {
      session.destroy();
      signal.throwIfAborted();
    }
    return session;
  }

  async describe(
    canvas: HTMLCanvasElement,
    signal: AbortSignal,
  ): Promise<string> {
    const session = await this.create(signal, [], {
      ...englishPromptOptions,
      expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
    });
    try {
      return await this.runtime.stream(
        session.promptStreaming(
          [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  value:
                    'Describe only visible details in this frame in two sentences. Do not infer character names or plot.',
                },
                { type: 'image', value: canvas },
              ],
            },
          ],
          { signal },
        ),
        signal,
      );
    } finally {
      session.destroy();
    }
  }
}
