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
    // create() allocates a conversational session and may download its model.
    // initialPrompts seed its context (for example, our catalogue/system instruction).
    // Return this session to its owner: the concierge keeps it for follow-up turns,
    // whereas a one-shot image request destroys it after producing its answer.
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
    // Text availability does not imply image-input availability. This session
    // explicitly declares both text and image input; the actual canvas is provided
    // as image content, not as a filename or an instruction to imagine a scene.
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
      // This image session has no follow-up conversation, so release it here. The
      // long-lived concierge follows the different ownership contract in create().
      session.destroy();
    }
  }
}
