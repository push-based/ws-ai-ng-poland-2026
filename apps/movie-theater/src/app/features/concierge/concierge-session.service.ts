import {
  DestroyRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { PromptApi } from '../../ai/prompt/prompt.api';
import { conciergeInstruction } from './concierge.prompts';
/** Owns browser model resources. Conversation text and recommendations belong to ConciergeService. */
@Injectable({ providedIn: 'root' })
export class ConciergeSession {
  private readonly runtime = inject(AiRuntime);
  private readonly prompt = inject(PromptApi);
  readonly usage = signal(0);
  readonly window = signal(0);
  readonly percent = computed(() =>
    this.window() ? Math.round((this.usage() / this.window()) * 100) : 0,
  );
  private active?: LanguageModel;
  private fork?: LanguageModel;

  constructor() {
    effect(() => {
      this.runtime.revision();
      untracked(() => this.reset());
    });
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  /** Reset releases both sessions; unrelated one-shot adapters have their own finally blocks. */
  reset() {
    this.active?.destroy();
    this.fork?.destroy();
    this.active = undefined;
    this.fork = undefined;
    this.usage.set(0);
    this.window.set(0);
  }

  async get(signal: AbortSignal): Promise<LanguageModel> {
    if (!this.active) {
      this.active = await this.prompt.create(signal, [
        { role: 'system', content: conciergeInstruction },
      ]);
      this.observe(this.active);
    }
    return this.active;
  }

  refreshUsage() {
    this.usage.set(this.active?.contextUsage ?? 0);
    this.window.set(this.active?.contextWindow ?? 0);
  }

  /** Fixture counts are illustrative, so the UI labels them as simulated. */
  advanceFixture() {
    this.usage.update((value) => value + 90);
    this.window.set(4096);
  }

  compactFixture() {
    this.usage.set(80);
  }

  async clone(signal: AbortSignal) {
    const original = await this.get(signal);
    const cloned = await original.clone({ signal });
    if (signal.aborted) {
      cloned.destroy();
      signal.throwIfAborted();
    }
    this.fork?.destroy();
    this.fork = original;
    this.active = cloned;
    this.observe(cloned);
    this.refreshUsage();
  }

  /** Build the replacement first: a failed compact operation must not destroy the usable conversation. */
  async replace(summary: string, signal: AbortSignal) {
    const replacement = await this.prompt.create(signal, [
      { role: 'system', content: conciergeInstruction },
      {
        role: 'user',
        content: `Previous conversation summary (may omit details): ${summary}`,
      },
    ]);
    this.active?.destroy();
    this.active = replacement;
    this.observe(replacement);
    this.refreshUsage();
  }

  private observe(session: LanguageModel) {
    session.addEventListener('contextoverflow', () =>
      this.runtime.trace(
        'Prompt',
        'contextoverflow',
        'Old turns may be evicted. Compact the conversation.',
      ),
    );
  }
}
