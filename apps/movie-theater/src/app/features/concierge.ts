import { Component, inject, signal, linkedSignal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import {
  LucideSparkles,
  LucideArrowUp,
  LucideRotateCcw,
} from '@lucide/angular';
import { AiService } from '../core/ai.service';
import { CinemaService } from '../core/cinema.service';
import { getMovie } from '@nano-cinema/catalogue';
let nextConciergeId = 0;
@Component({
  selector: 'app-cinema-concierge',
  imports: [FormField, LucideSparkles, LucideArrowUp, LucideRotateCcw],
  template: `
    <section class="concierge panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">YOUR PERSONAL PROGRAMMER</span>
          <h2><svg lucideSparkles></svg> A little help choosing?</h2>
        </div>
        <span class="api-chip">Prompt API</span>
      </div>
      <p>Tell us the mood. We’ll find your next small escape.</p>
      <div class="suggestions">
        @for (suggestion of suggestions; track suggestion) {
          <button
            type="button"
            (click)="ask(suggestion)"
            [disabled]="ai.busy()"
          >
            {{ suggestion }}
          </button>
        }
      </div>
      <form (submit)="submit($event)">
        <label class="sr-only" [for]="requestId">Your movie preferences</label
        ><input
          [id]="requestId"
          [formField]="requestForm.request"
          placeholder="Something atmospheric, with a little adventure…"
          autocomplete="off"
        /><button
          class="send"
          aria-label="Find a movie"
          [disabled]="ai.busy() || requestForm().invalid()"
        >
          <svg lucideArrowUp></svg>
        </button>
      </form>
      @if (ai.busy()) {
        <div class="working">
          <span class="status-dot"></span>
          {{
            ai.mode() === 'fixture'
              ? 'Workshop fixture running'
              : 'Local AI task running'
          }}
          <button (click)="ai.stop()">Stop</button>
        </div>
      }
      @if (ai.streamed() && ai.busy()) {
        <p class="stream" aria-live="polite">{{ ai.streamed() }}</p>
      }
      @if (result(); as recommendation) {
        <div class="recommendation" aria-live="polite">
          <span class="eyebrow">OUR PICK FOR YOU</span>
          <h3>{{ title(recommendation.movieId) }}</h3>
          <p>{{ recommendation.reason }}</p>
          <button
            class="button primary small"
            (click)="watch(recommendation.movieId)"
            [disabled]="ai.busy()"
          >
            Enter screening room
          </button>
        </div>
      }
      @if (ai.detected(); as detected) {
        <p class="micro">
          Request language: {{ detected.language }} ·
          {{ percent(detected.confidence) }}% confidence. Subtitle language
          stays your choice.
        </p>
      }
      <label class="micro"
        >Request language
        <select
          [value]="requestLanguage()"
          (change)="requestLanguage.set(languageValue($event))"
          [disabled]="ai.busy()"
        >
          <option value="">Detect automatically</option>
          <option value="en">English</option>
          <option value="pl">Polski</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select></label
      >
      <p class="micro">Override detection for short or ambiguous requests.</p>
      <div class="context">
        <div>
          <span>Session context</span
          ><span
            >{{ ai.contextUsage() }} / {{ ai.contextWindow() || '—' }} tokens
            {{ ai.mode() === 'fixture' ? '(simulated)' : '' }}</span
          >
        </div>
        <progress
          [value]="ai.contextPercent()"
          max="100"
          aria-label="Session context usage"
        ></progress>
        <div class="context-actions">
          <button (click)="run(ai.clone())" [disabled]="ai.busy()">
            Fork session</button
          ><button
            (click)="run(ai.compact())"
            [disabled]="ai.busy() || !ai.history().length"
          >
            Compact history</button
          ><button (click)="reset()" [disabled]="ai.busy()">
            <svg lucideRotateCcw></svg> Reset
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .concierge {
        padding: 28px;
      }
      .section-heading h2 {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .section-heading h2 svg {
        color: var(--amber);
        width: 21px;
      }
      .concierge > p {
        color: var(--muted);
        font-size: 14px;
        margin: 12px 0 20px;
      }
      .suggestions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      .suggestions button {
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 8px 12px;
        background: transparent;
        color: var(--muted);
        font-size: 12px;
      }
      .suggestions button:hover {
        border-color: var(--amber);
        color: var(--text);
      }
      form {
        display: flex;
        background: #111416;
        border: 1px solid #3d4145;
        border-radius: 12px;
        padding: 6px;
        gap: 6px;
      }
      input {
        width: 100%;
        border: none;
        background: none;
        padding: 12px;
        color: var(--text);
        min-width: 0;
      }
      .send {
        background: var(--amber);
        color: #181512;
        border: 0;
        border-radius: 8px;
        width: 42px;
        flex-shrink: 0;
      }
      .send svg {
        width: 19px;
      }
      .working {
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 12px;
        margin-top: 15px;
      }
      .working button {
        margin-left: auto;
      }
      .stream {
        white-space: pre-wrap;
      }
      .recommendation {
        border-left: 2px solid var(--amber);
        padding: 16px 20px;
        margin: 20px 0;
        background: #e9af5310;
      }
      .recommendation h3 {
        font-size: 22px;
        margin: 7px 0;
      }
      .recommendation p {
        font-size: 14px;
        line-height: 1.6;
        color: var(--muted);
      }
      .context {
        margin-top: 24px;
        border-top: 1px solid var(--line);
        padding-top: 18px;
      }
      .context > div:first-child {
        display: flex;
        justify-content: space-between;
        color: var(--muted);
        font-size: 11px;
      }
      .context progress {
        width: 100%;
        height: 4px;
        accent-color: var(--amber);
        margin-top: 10px;
      }
      .context-actions {
        display: flex;
        gap: 15px;
        margin-top: 13px;
      }
      .context-actions button,
      .working button {
        background: none;
        border: none;
        padding: 0;
        color: var(--muted);
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .context-actions svg {
        width: 12px;
        height: 12px;
      }
    `,
  ],
})
export class Concierge {
  readonly ai = inject(AiService);
  readonly cinema = inject(CinemaService);
  readonly model = linkedSignal({
    source: () => this.cinema.resetRevision(),
    computation: () => ({ request: '' }),
  });
  readonly requestForm = form(this.model, (path) => required(path.request));
  readonly result = this.ai.recommendation;
  readonly requestLanguage = signal('');
  languageValue(event: Event) {
    return (event.target as HTMLSelectElement).value;
  }
  readonly requestId = `concierge-request-${nextConciergeId++}`;
  readonly suggestions = [
    'A playful comedy',
    'Something surreal',
    'An atmospheric adventure',
  ];
  title(id: string) {
    return getMovie(id).title;
  }
  percent(n: number) {
    return Math.round(n * 100);
  }
  submit(event: Event) {
    event.preventDefault();
    void this.ask(this.model().request);
  }
  async ask(text: string) {
    if (!text.trim() || this.ai.busy()) return;
    this.model.set({ request: text });
    try {
      this.result.set(await this.ai.recommend(text, this.requestLanguage()));
    } catch {
      /* Error is visible in app. */
    }
  }
  watch(id: string) {
    this.cinema.select(id);
    this.cinema.view.set('screening');
  }
  async run(task: Promise<unknown>) {
    try {
      await task;
    } catch {
      /* Error is visible in app. */
    }
  }
  reset() {
    this.ai.reset();
    this.result.set(null);
  }
}
