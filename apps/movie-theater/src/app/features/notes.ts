import { Component, inject, signal, linkedSignal } from '@angular/core';
import { CinemaService } from '../core/cinema.service';
@Component({
  selector: 'app-cinema-notes',
  template: `
    <section class="panel notes">
      <div class="section-heading">
        <div>
          <span class="eyebrow">THE PROGRAMME NOTES</span>
          <h2>The story, distilled.</h2>
        </div>
        <span class="api-chip">Summarizer API</span>
      </div>
      <p>
        Turn our written film notes into a quick read. Teasers use only the
        spoiler-free synopsis.
      </p>
      <div class="options">
        <label
          >Style<select [value]="type()" (change)="setType($event)">
            <option value="teaser">Teaser</option>
            <option value="tldr">TL;DR</option>
            <option value="key-points">Key points</option>
            <option value="headline">Headline</option>
          </select></label
        ><label
          >Length<select [value]="length()" (change)="setLength($event)">
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select></label
        >
      </div>
      <div class="options">
        <label
          >Format<select [value]="format()" (change)="setFormat($event)">
            <option value="plain-text">Plain text</option>
            <option value="markdown">Markdown as text</option>
          </select></label
        >
        <label
          >Preference<select
            [value]="preference()"
            (change)="setPreference($event)"
          >
            <option value="auto">Auto</option>
            <option value="speed">Speed</option>
            <option value="capability">Capability</option>
          </select></label
        >
      </div>
      <label class="check"
        ><input
          type="checkbox"
          [checked]="chunked()"
          (change)="chunked.set(!chunked())"
        />
        Summarize sections, then combine
        <span class="micro">(uses all notes)</span></label
      >
      <button
        class="button primary"
        (click)="summarize()"
        [disabled]="cinema.ai.busy()"
      >
        Generate {{ type() }}
      </button>
      @if (result()) {
        <div class="result" aria-live="polite">{{ result() }}</div>
      }
      <details>
        <summary>
          Read the source notes · {{ cinema.movie().notes.length }} sections
        </summary>
        @for (note of cinema.movie().notes; track $index) {
          <p>{{ note }}</p>
        }
      </details>
      @if (chunked()) {
        <p class="micro">
          Each stage may lose facts. Compare the combined result with the
          original notes.
        </p>
      }
    </section>
  `,
  styles: [
    `
      .notes {
        padding: 26px;
      }
      .notes > p {
        font-size: 13px;
        line-height: 1.6;
        color: var(--muted);
      }
      .options {
        display: flex;
        gap: 16px;
        margin: 24px 0 18px;
      }
      .options label {
        flex: 1;
        color: var(--muted);
        font-size: 12px;
      }
      .options select {
        display: block;
        width: 100%;
        margin-top: 8px;
      }
      .check {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 22px;
        flex-wrap: wrap;
      }
      .check input {
        accent-color: var(--amber);
      }
      .result {
        white-space: pre-wrap;
        font-size: 14px;
        line-height: 1.7;
        border-left: 2px solid var(--amber);
        padding: 16px;
        margin-top: 20px;
        background: #e9af530a;
      }
      details {
        border-top: 1px solid var(--line);
        margin-top: 24px;
        padding-top: 18px;
      }
      summary {
        color: var(--muted);
        font-size: 12px;
        cursor: pointer;
      }
      details p {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
      }
    `,
  ],
})
export class Notes {
  readonly cinema = inject(CinemaService);
  readonly type = signal<SummarizerType>('teaser');
  readonly length = signal<SummarizerLength>('short');
  readonly chunked = signal(false);
  readonly format = signal<SummarizerFormat>('plain-text');
  readonly preference = signal<PerformancePreference>('auto');
  setFormat(event: Event) {
    this.format.set(
      (event.target as HTMLSelectElement).value as SummarizerFormat,
    );
  }
  setPreference(event: Event) {
    this.preference.set(
      (event.target as HTMLSelectElement).value as PerformancePreference,
    );
  }
  readonly result = linkedSignal({
    source: () => [
      this.cinema.movieId(),
      this.cinema.ai.mode(),
      this.cinema.resetRevision(),
    ],
    computation: () => '',
  });
  setType(event: Event) {
    this.type.set((event.target as HTMLSelectElement).value as SummarizerType);
  }
  setLength(event: Event) {
    this.length.set(
      (event.target as HTMLSelectElement).value as SummarizerLength,
    );
  }
  async summarize() {
    try {
      this.result.set(
        await this.cinema.ai.summarize(
          this.cinema.movie(),
          this.type(),
          this.length(),
          this.chunked(),
          this.format(),
          this.preference(),
        ),
      );
    } catch {
      /* App shows errors. */
    }
  }
}
