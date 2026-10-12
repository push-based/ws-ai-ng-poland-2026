import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { PromptApi } from '../../ai/prompt/prompt.api';
@Injectable({ providedIn: 'root' })
export class SceneDescriptionService {
  private readonly runtime = inject(AiRuntime);
  private readonly prompt = inject(PromptApi);

  describe(canvas: HTMLCanvasElement): Promise<string> {
    return this.runtime.run('Prompt', 'image input', (signal) =>
      this.runtime.mode() === 'fixture'
        ? Promise.resolve(
            'Fixture scene description: examine the captured frame and describe its composition, colour and visible subjects. Native mode sends this actual canvas to the local model.',
          )
        : this.prompt.describe(canvas, signal),
    );
  }
}
