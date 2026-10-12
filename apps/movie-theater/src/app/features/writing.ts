import { Component, inject, signal, linkedSignal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { CinemaService } from '../core/cinema.service';
@Component({
  selector: 'app-cinema-writing',
  imports: [FormField],
  template: `
    <section class="panel writing">
      <div class="section-heading">
        <div>
          <span class="eyebrow">THE EDITOR’S DESK · EXPERIMENTAL</span>
          <h2>A few words before the credits.</h2>
        </div>
        <span class="api-chip">Writing APIs</span>
      </div>
      <p>
        Draft a programme introduction, change its tone, or proofread a review.
        These developer-trial APIs are optional workshop extensions.
      </p>
      <label for="writing-draft">Your draft</label
      ><textarea
        id="writing-draft"
        [formField]="draftForm.text"
        rows="4"
      ></textarea>
      <div class="writing-actions">
        <button
          class="button secondary small"
          (click)="write('Writer')"
          [disabled]="cinema.ai.busy() || draftForm().invalid()"
        >
          Writer · Draft intro</button
        ><button
          class="button secondary small"
          (click)="write('Rewriter')"
          [disabled]="cinema.ai.busy() || draftForm().invalid()"
        >
          Rewriter · Make casual</button
        ><button
          class="button secondary small"
          (click)="write('Proofreader')"
          [disabled]="cinema.ai.busy() || draftForm().invalid()"
        >
          Proofreader · Correct
        </button>
      </div>
      @if (result()) {
        <div class="result" aria-live="polite">{{ result() }}</div>
        <button
          class="button primary small"
          (click)="accept()"
          [disabled]="cinema.ai.busy()"
        >
          Accept into draft
        </button>
      }
      <p class="micro">
        Suggestions need review. Accepting is a separate user action.
      </p>
    </section>
  `,
  styles: [
    `
      .writing {
        padding: 28px;
        margin-top: 26px;
      }
      .writing > p {
        font-size: 13px;
        line-height: 1.7;
        color: var(--muted);
      }
      label {
        display: block;
        font-size: 11px;
        color: var(--muted);
        margin: 18px 0 8px;
      }
      textarea {
        width: 100%;
        background: #0f1315;
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--text);
        padding: 14px;
        resize: vertical;
        line-height: 1.6;
      }
      .writing-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }
      .result {
        white-space: pre-wrap;
        line-height: 1.7;
        font-size: 14px;
        padding: 16px;
        background: #e8b6690a;
        border-left: 2px solid var(--amber);
        margin: 18px 0;
      }
    `,
  ],
})
export class Writing {
  readonly cinema = inject(CinemaService);
  readonly draft = signal({
    text: 'I realy enjoyed teh atmosphere of this open movie.',
  });
  readonly draftForm = form(this.draft, (path) => required(path.text));
  readonly result = linkedSignal({
    source: () => [
      this.cinema.movieId(),
      this.cinema.ai.mode(),
      this.cinema.resetRevision(),
    ],
    computation: () => '',
  });
  async write(kind: 'Writer' | 'Rewriter' | 'Proofreader') {
    try {
      this.result.set(
        await this.cinema.ai.writing(
          kind,
          kind === 'Writer'
            ? this.cinema.movie().description
            : this.draft().text,
        ),
      );
    } catch {
      /* App shows errors. */
    }
  }
  accept() {
    this.draft.set({ text: this.result() });
    this.result.set('');
  }
}
