import { Injectable, VERSION, inject, signal } from '@angular/core';
import { CapabilitiesService } from '../../ai/capabilities.service';
import { englishPromptOptions, errorMessage } from '../../ai/ai.types';
import { WebmcpService } from '../../core/webmcp/webmcp.service';

export type Readiness = 'ready' | 'prepare' | 'unsupported' | 'unchecked';
export interface PreflightCheck {
  name: string;
  task: string;
  state: string;
  readiness: Readiness;
}

// Availability is evidence for one configuration, not proof that inference succeeds.
// Never estimate hardware eligibility from navigator hints: the browser owns that check.
export function readiness(state: string): Readiness {
  if (state === 'available' || state === 'registered' || state === 'present') {
    return 'ready';
  }
  if (state === 'downloadable' || state === 'downloading') {
    return 'prepare';
  }
  if (state === 'not checked') {
    return 'unchecked';
  }
  return 'unsupported';
}

@Injectable({ providedIn: 'root' })
export class PreflightService {
  readonly capabilities = inject(CapabilitiesService);
  readonly tools = inject(WebmcpService);
  readonly checking = signal(false);
  readonly checkedAt = signal('');
  readonly checks = signal<PreflightCheck[]>([]);

  async check() {
    if (this.checking()) return;
    this.checking.set(true);
    try {
      await Promise.all([this.capabilities.check(), this.tools.register()]);
      const checks = this.capabilities.capabilities().map((api) => ({
        name: api.name,
        task: api.detail,
        state: api.state,
        readiness: readiness(api.state),
      }));
      // Text and image Prompt tasks need separate checks. Likewise, Translator
      // support in one direction does not imply the reverse language pair works.
      const extra = await Promise.all([
        this.nativeCheck(
          'Prompt image',
          'English text + image → English text',
          typeof LanguageModel !== 'undefined',
          () =>
            LanguageModel.availability({
              ...englishPromptOptions,
              expectedInputs: [
                { type: 'text', languages: ['en'] },
                { type: 'image' },
              ],
            }),
        ),
        this.nativeCheck(
          'Translator reverse',
          'Polish → English',
          typeof Translator !== 'undefined',
          () =>
            Translator.availability({
              sourceLanguage: 'pl',
              targetLanguage: 'en',
            }),
        ),
      ]);
      const webmcp = this.tools.registered() ? 'registered' : 'missing';
      // Requesting an adapter checks actual WebGPU availability without loading
      // ONNX weights or starting inference. A present navigator.gpu alone is weaker evidence.
      let gpu = 'missing';
      const gpuApi = (
        navigator as Navigator & {
          gpu?: { requestAdapter(): Promise<unknown> };
        }
      ).gpu;
      if (gpuApi) {
        try {
          gpu = (await gpuApi.requestAdapter()) ? 'present' : 'no adapter';
        } catch (error) {
          gpu = errorMessage(error);
        }
      }
      this.checks.set([
        ...checks,
        ...extra,
        {
          name: 'WebMCP',
          task: 'Page tool registration',
          state: webmcp,
          readiness: readiness(webmcp),
        },
        {
          name: 'WebGPU',
          task: 'Optional adapter; detector remains off',
          state: gpu,
          readiness: readiness(gpu),
        },
      ]);
      this.checkedAt.set(new Date().toISOString());
    } finally {
      this.checking.set(false);
    }
  }

  report() {
    // This is intentionally capability metadata only: no movie comments, user
    // prompts, model output, hardware identifiers or entire trace log are exported.
    return {
      schemaVersion: 1,
      checkedAt: this.checkedAt() || null,
      browser: navigator.userAgent,
      angular: VERSION.full,
      secureContext: isSecureContext,
      webmcp: {
        surface: 'document.modelContext',
        registered: this.tools.registered(),
        nativeExecution: this.tools.nativeExecution(),
        discoveredTools: this.tools.discovered().map((tool) => tool.name),
      },
      checks: this.checks(),
      unchecked: [
        'Native inference requires an explicit task run',
        'Free storage / VRAM / RAM are not measured by this page',
        'ONNX assets are verified by pnpm onnx:download',
      ],
    };
  }

  private async nativeCheck(
    name: string,
    task: string,
    present: boolean,
    check: () => Promise<Availability>,
  ): Promise<PreflightCheck> {
    let state = 'missing';
    try {
      if (present) state = await check();
    } catch (error) {
      state = errorMessage(error);
    }
    return { name, task, state, readiness: readiness(state) };
  }
}
