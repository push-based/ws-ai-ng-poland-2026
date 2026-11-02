import { Component, OnDestroy, computed, signal } from '@angular/core';
import { getMovie, movies } from '@nano-cinema/catalogue';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  type SummarizerSupport,
  programmeNotes,
  summarize,
  summarizerAvailability,
  summaryOptions,
} from './exercise';

/** Ready-made UI for exercise 3.1. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-summarizer',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabSummarizer implements OnDestroy {
  readonly log = new LabLog();
  readonly movies = movies;
  readonly types: SummarizerType[] = [
    'tldr',
    'teaser',
    'key-points',
    'headline',
  ];
  readonly lengths: SummarizerLength[] = ['short', 'medium', 'long'];
  readonly formats: SummarizerFormat[] = ['plain-text', 'markdown'];

  readonly movieId = signal(movies[0].id);
  readonly type = signal<SummarizerType>('tldr');
  readonly length = signal<SummarizerLength>('short');
  readonly format = signal<SummarizerFormat>('plain-text');
  readonly sharedContext = signal(
    'Programme notes for a small cinema. Do not reveal endings.',
  );
  readonly context = signal('');

  readonly source = computed(() =>
    programmeNotes(getMovie(this.movieId()) ?? movies[0]),
  );
  readonly preview = signal('');
  readonly support = signal<SummarizerSupport | ''>('');
  readonly progress = signal(0);
  readonly result = signal('');
  readonly timing = signal('');
  private controller?: AbortController;

  setMovie(event: Event) {
    this.movieId.set((event.target as HTMLSelectElement).value);
    this.result.set('');
  }
  setType(event: Event) {
    this.type.set((event.target as HTMLSelectElement).value as SummarizerType);
  }
  setLength(event: Event) {
    this.length.set(
      (event.target as HTMLSelectElement).value as SummarizerLength,
    );
  }
  setFormat(event: Event) {
    this.format.set(
      (event.target as HTMLSelectElement).value as SummarizerFormat,
    );
  }
  setSharedContext(event: Event) {
    this.sharedContext.set((event.target as HTMLInputElement).value);
  }
  setContext(event: Event) {
    this.context.set((event.target as HTMLInputElement).value);
  }

  private options() {
    return summaryOptions(
      this.type(),
      this.length(),
      this.format(),
      this.sharedContext(),
    );
  }

  showOptions() {
    void this.log.run('summaryOptions()', () => {
      this.preview.set(JSON.stringify(this.options(), null, 2));
    });
  }

  async checkAvailability() {
    const support = await this.log.run('summarizerAvailability()', () =>
      summarizerAvailability(this.options()),
    );
    if (support) {
      this.support.set(support);
      this.log.info(`Summarizer with these options: ${support}`);
    }
  }

  async run() {
    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.result.set('');
    this.timing.set('');
    this.progress.set(0);
    const started = performance.now();
    const summary = await this.log.run('summarize()', () =>
      summarize(
        this.source(),
        this.options(),
        controller.signal,
        this.context(),
        (loaded) => this.progress.set(loaded),
      ),
    );
    if (summary !== undefined) {
      this.result.set(summary);
      this.timing.set(
        `${Math.round(performance.now() - started)} ms · ${this.source().length} characters in, ${summary.length} out`,
      );
    }
  }

  stop() {
    this.controller?.abort();
  }

  ngOnDestroy() {
    // Aborting cancels a running create()/summarize(); Step 4 destroys the summarizer.
    this.controller?.abort();
  }
}
