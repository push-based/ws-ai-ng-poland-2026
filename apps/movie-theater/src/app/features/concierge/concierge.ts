import { Component, inject, signal, linkedSignal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import {
  LucideSparkles,
  LucideArrowUp,
  LucideRotateCcw,
} from '@lucide/angular';
import { ConciergeService } from './concierge.service';
import { CinemaService } from '../../core/cinema.service';
import { Router } from '@angular/router';
import { getMovie } from '@nano-cinema/catalogue';
let nextConciergeId = 0;
@Component({
  selector: 'app-cinema-concierge',
  imports: [FormField, LucideSparkles, LucideArrowUp, LucideRotateCcw],
  templateUrl: './concierge.html',
  styleUrl: './concierge.css',
})
export class Concierge {
  readonly conversation = inject(ConciergeService);
  readonly runtime = this.conversation.runtime;
  readonly cinema = inject(CinemaService);
  private readonly router = inject(Router);
  readonly model = linkedSignal({
    source: () => this.cinema.resetRevision(),
    computation: () => ({ request: '' }),
  });
  readonly requestForm = form(this.model, (path) => required(path.request));
  readonly result = this.conversation.recommendation;
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
    if (!text.trim() || this.runtime.busy()) return;
    this.model.set({ request: text });
    try {
      await this.conversation.recommend(text, this.requestLanguage());
    } catch {
      /* Error is visible in app. */
    }
  }

  watch(id: string) {
    void this.router.navigate(['/movies', id]);
  }

  async run(task: Promise<unknown>) {
    try {
      await task;
    } catch {
      /* Error is visible in app. */
    }
  }

  reset() {
    this.conversation.reset();
  }
}
