import { Component, OnDestroy, signal } from '@angular/core';
import { type Movie, movies } from '@nano-cinema/catalogue';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  type Enhancement,
  type ShortDescription,
  basicExcerpt,
  detectEnhancement,
  shortDescription,
} from './exercise';

/** Ready-made UI for exercise 1.4. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-progressive-enhancement',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabProgressiveEnhancement implements OnDestroy {
  readonly log = new LabLog();
  readonly movies = movies;
  readonly pretendNoAi = signal(false);
  readonly enhancement = signal<Enhancement | undefined>(undefined);
  readonly maxSentences = signal(2);
  readonly excerpt = signal('');
  readonly results = signal<Record<string, ShortDescription>>({});
  private controller = new AbortController();

  notes(movie: Movie): string {
    return movie.notes.join(' ');
  }

  async detect() {
    const result = await this.log.run('detectEnhancement()', () =>
      this.maybeWithoutAi(() => detectEnhancement()),
    );
    if (result) this.enhancement.set(result);
  }

  showExcerpt() {
    void this.log.run(`basicExcerpt(notes, ${this.maxSentences()})`, () => {
      this.excerpt.set(
        basicExcerpt(this.notes(movies[0]), this.maxSentences()),
      );
    });
  }

  async shorten(movie: Movie) {
    const result = await this.log.run(`shortDescription(${movie.id})`, () =>
      this.maybeWithoutAi(() =>
        shortDescription(this.notes(movie), this.controller.signal),
      ),
    );
    if (result)
      this.results.update((results) => ({ ...results, [movie.id]: result }));
  }

  async shortenAll() {
    for (const movie of movies) await this.shorten(movie);
  }

  togglePretend(event: Event) {
    this.pretendNoAi.set((event.target as HTMLInputElement).checked);
    this.enhancement.set(undefined);
    this.results.set({});
  }

  setMaxSentences(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value > 0) this.maxSentences.set(value);
  }

  // "Pretend this browser has no AI": hide the Summarizer global while the
  // participant's code runs, exactly what a browser without the API looks like.
  private async maybeWithoutAi<T>(work: () => Promise<T>): Promise<T> {
    if (!this.pretendNoAi()) return work();
    const global = globalThis as Record<string, unknown>;
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'Summarizer',
    );
    if (descriptor) delete global['Summarizer'];
    if (typeof global['Summarizer'] !== 'undefined')
      this.log.info('This browser would not let the page hide Summarizer.');
    try {
      return await work();
    } finally {
      if (descriptor)
        Object.defineProperty(globalThis, 'Summarizer', descriptor);
    }
  }

  ngOnDestroy() {
    this.controller.abort();
  }
}
