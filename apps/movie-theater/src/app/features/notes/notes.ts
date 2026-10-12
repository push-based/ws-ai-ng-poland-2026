import { Component, inject, signal, linkedSignal } from '@angular/core';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { MovieSummaryService } from './movie-summary.service';
import { CinemaService } from '../../core/cinema.service';
@Component({
  selector: 'app-cinema-notes',
  templateUrl: './notes.html',
  styleUrl: './notes.css',
})
export class Notes {
  readonly cinema = inject(CinemaService);
  readonly runtime = inject(AiRuntime);
  private readonly summaries = inject(MovieSummaryService);
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
      this.runtime.mode(),
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
        await this.summaries.summarize(
          this.cinema.movie(),
          {
            type: this.type(),
            length: this.length(),
            format: this.format(),
            preference: this.preference(),
          },
          this.chunked(),
        ),
      );
    } catch {
      /* App shows errors. */
    }
  }
}
