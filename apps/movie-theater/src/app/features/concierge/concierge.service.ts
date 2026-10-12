import {
  DestroyRef,
  Injectable,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Recommendation, validateRecommendation } from '@nano-cinema/catalogue';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { ConversationTurn, DetectedLanguage } from '../../ai/ai.types';
import { SummarizerApi } from '../../ai/summarizer/summarizer.api';
import { LanguageDetectorApi } from '../../ai/language/language-detector.api';
import { TranslatorApi } from '../../ai/language/translator.api';
import { fixtureLanguage, fixtureRecommendation } from '../../ai/fixtures';
import { ConciergeSession } from './concierge-session.service';
import { recommendationSchema } from './concierge.prompts';

/** Composes APIs for a movie recommendation. Session resource ownership lives in ConciergeSession. */
@Injectable({ providedIn: 'root' })
export class ConciergeService {
  readonly runtime = inject(AiRuntime);
  private readonly sessions = inject(ConciergeSession);
  private readonly summaries = inject(SummarizerApi);
  private readonly languages = inject(LanguageDetectorApi);
  private readonly translator = inject(TranslatorApi);

  readonly contextUsage = this.sessions.usage.asReadonly();
  readonly contextWindow = this.sessions.window.asReadonly();
  readonly contextPercent = this.sessions.percent;
  readonly history = signal<ConversationTurn[]>([]);
  readonly recommendation = signal<Recommendation | null>(null);
  readonly detected = signal<DetectedLanguage | null>(null);

  constructor() {
    effect(() => {
      this.runtime.revision();
      untracked(() => this.reset());
    });
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  reset() {
    this.sessions.reset();
    this.history.set([]);
    this.recommendation.set(null);
    this.detected.set(null);
  }

  async prepare() {
    if (this.runtime.mode() === 'fixture') {
      this.runtime.trace(
        'Browser',
        'prepare',
        'Fixtures need no model download.',
      );
      return;
    }
    await this.runtime.run('Prompt', 'create()', async (signal) => {
      await this.sessions.get(signal);
      this.sessions.refreshUsage();
    });
  }

  async recommend(request: string, languageOverride = ''): Promise<void> {
    const result = await this.runtime.run(
      'Prompt',
      'promptStreaming() + responseConstraint',
      async (signal) => {
        if (this.runtime.mode() === 'fixture') {
          return this.fixture(request, languageOverride, signal);
        }

        const session = await this.sessions.get(signal);
        const language = languageOverride
          ? { language: languageOverride, confidence: 1 }
          : await this.languages.detect(request, signal);
        this.detected.set(language);

        // Foundation-model reasoning uses English. Translation is explicit,
        // and the user's subtitle choice is independent of request language.
        const english = await this.translator.translate(
          request,
          language.language,
          'en',
          signal,
        );
        const explanation = await this.runtime.stream(
          session.promptStreaming(english, { signal }),
          signal,
        );
        const json = await session.prompt(
          'Return your recommended movie ID and concise reason as structured data.',
          { signal, responseConstraint: recommendationSchema },
        );
        // JSON shape is insufficient: the ID must resolve to a real catalogue entry.
        const recommendation = validateRecommendation(JSON.parse(json));

        if (language.language !== 'en') {
          recommendation.reason = await this.translator.translate(
            recommendation.reason,
            'en',
            language.language,
            signal,
          );
          this.runtime.setStreamed(recommendation.reason);
        }
        signal.throwIfAborted();
        this.appendHistory(english, explanation);
        this.sessions.refreshUsage();
        this.runtime.trace(
          'Prompt',
          'validated JSON',
          JSON.stringify(recommendation),
        );
        return recommendation;
      },
    );
    this.recommendation.set(result);
  }

  async clone() {
    await this.runtime.run('Prompt', 'clone()', async (signal) => {
      if (this.runtime.mode() === 'fixture') {
        this.runtime.trace(
          'Prompt',
          'clone',
          'Fixture: isolated conversation branch.',
        );
        return;
      }
      await this.sessions.clone(signal);
      this.runtime.trace(
        'Prompt',
        'clone',
        'Active session is now the fork; original remains isolated until reset.',
      );
    });
  }

  async compact() {
    await this.runtime.run(
      'Summarizer',
      'compact conversation',
      async (signal) => {
        if (!this.history().length)
          throw new Error('Ask the concierge a question first.');
        const text = this.history()
          .map((turn) => `${turn.role}: ${turn.content}`)
          .join('\n');
        const summary =
          this.runtime.mode() === 'fixture'
            ? this.history()
                .slice(-2)
                .map((turn) => turn.content)
                .join('\n')
            : await this.summaries.summarize(
                text,
                {
                  type: 'tldr',
                  length: 'short',
                  format: 'plain-text',
                  preference: 'auto',
                },
                signal,
              );

        if (this.runtime.mode() === 'fixture') this.sessions.compactFixture();
        else await this.sessions.replace(summary, signal);
        // Keep the original history for comparison: compaction is lossy.
        this.runtime.trace(
          'Prompt',
          'recreate with compacted initialPrompts',
          summary,
        );
      },
    );
  }

  private appendHistory(request: string, response: string) {
    this.history.update((turns) => [
      ...turns,
      { role: 'user', content: request },
      { role: 'assistant', content: response },
    ]);
  }

  private async fixture(
    request: string,
    override: string,
    signal: AbortSignal,
  ): Promise<Recommendation> {
    const result = fixtureRecommendation(request);
    this.detected.set(
      override
        ? { language: override, confidence: 1 }
        : fixtureLanguage(request),
    );
    let streamed = '';
    for (const word of result.reason.split(' ')) {
      signal.throwIfAborted();
      await new Promise((resolve) => setTimeout(resolve, 25));
      signal.throwIfAborted();
      streamed += word + ' ';
      this.runtime.setStreamed(streamed);
    }
    this.appendHistory(request, result.reason);
    this.sessions.advanceFixture();
    return result;
  }
}
