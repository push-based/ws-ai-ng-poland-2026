import {
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormField,
  form,
  maxLength,
  required,
  disabled,
} from '@angular/forms/signals';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { CinemaService } from '../../core/cinema.service';
import { CommentsStore } from './comments.store';
import {
  CommentAssistance,
  CommentAssistanceService,
} from './comment-assistance.service';
import { MAX_COMMENT_LENGTH } from './comments.model';
@Component({
  selector: 'app-movie-comments',
  imports: [FormField, DatePipe],
  templateUrl: './comments.html',
  styleUrl: './comments.css',
})
export class Comments {
  readonly cinema = inject(CinemaService);
  readonly runtime = inject(AiRuntime);
  readonly store = inject(CommentsStore);
  private readonly assistance = inject(CommentAssistanceService);
  readonly maxLength = MAX_COMMENT_LENGTH;
  readonly draft = linkedSignal({
    source: () => [this.cinema.movieId(), this.cinema.resetRevision()],
    computation: () => ({ text: '' }),
  });
  readonly draftForm = form(this.draft, (path) => {
    required(path.text);
    maxLength(path.text, MAX_COMMENT_LENGTH);
    disabled(path.text, () => this.runtime.busy());
  });
  readonly suggestion = linkedSignal({
    source: () => [this.cinema.movieId(), this.runtime.revision()],
    computation: () => '',
  });
  readonly tone = signal<RewriterTone>('more-casual');
  readonly saved = linkedSignal({
    source: () => [this.cinema.movieId(), this.cinema.resetRevision()],
    computation: () => false,
  });
  readonly comments = computed(() =>
    this.store
      .comments()
      .filter((comment) => comment.movieId === this.cinema.movieId()),
  );

  setTone(event: Event) {
    this.tone.set((event.target as HTMLSelectElement).value as RewriterTone);
  }

  // Keep generated text in a separate suggestion. The existing draft survives
  // a failed task or a rejected suggestion; accepting it edits the draft, and only
  // Save comment persists it. The model never publishes on the viewer's behalf.
  async assist(action: CommentAssistance) {
    if (!this.draft().text.trim() || this.runtime.busy()) return;
    this.saved.set(false);
    this.suggestion.set('');
    try {
      this.suggestion.set(
        await this.assistance.suggest(
          action,
          this.cinema.movie(),
          this.draft().text,
          this.tone(),
        ),
      );
    } catch {
      /* Runtime owns the visible AI error. */
    }
  }

  /** Applying a suggestion edits the draft only; saving to storage remains a separate user action. */
  accept() {
    this.draft.set({ text: this.suggestion() });
    this.suggestion.set('');
    this.saved.set(false);
  }

  discard() {
    this.suggestion.set('');
  }

  post(event: Event) {
    event.preventDefault();
    if (
      this.runtime.busy() ||
      this.draftForm().invalid() ||
      !this.draft().text.trim()
    )
      return;
    if (this.store.add(this.cinema.movieId(), this.draft().text)) {
      this.draft.set({ text: '' });
      this.suggestion.set('');
      this.saved.set(true);
    }
  }
}
