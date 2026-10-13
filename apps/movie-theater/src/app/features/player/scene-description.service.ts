import { Injectable, inject } from '@angular/core';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { PromptApi } from '../../ai/prompt/prompt.api';
@Injectable({ providedIn: 'root' })
export class SceneDescriptionService {
  private readonly runtime = inject(AiRuntime);
  private readonly prompt = inject(PromptApi);

  // This is multimodal Prompt inference on one captured frame. It has no access
  // to the rest of the movie or audio; ask about visible detail, then compare the
  // answer with the shown image instead of treating inferred plot as observation.
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
