import { Component, OnDestroy, computed, signal } from '@angular/core';
import { getMovie, movies } from '@nano-cinema/catalogue';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  readText,
  streamOptions,
  summarizeOnce,
  timedStreaming,
} from './exercise';

interface Timing {
  firstTextMs: number;
  totalMs: number;
}

const demoSentence =
  'Streams deliver text in small pieces, so the page can show each word as soon as it exists.';

/** A tiny stream without any AI: one word every 120 ms, for testing Step 1 alone. */
function demoStream(): ReadableStream<string> {
  const words = demoSentence.match(/\S+\s*/g) ?? [];
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new ReadableStream<string>({
    pull(controller) {
      return new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          if (index < words.length) controller.enqueue(words[index++]);
          else controller.close();
          resolve();
        }, 120);
      });
    },
    cancel() {
      clearTimeout(timer);
    },
  });
}

/** Ready-made UI for exercise 3.2. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-streaming-summaries',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabStreamingSummaries implements OnDestroy {
  readonly log = new LabLog();
  readonly movies = movies;
  readonly lengths: SummarizerLength[] = ['short', 'medium', 'long'];
  readonly movieId = signal(movies[0].id);
  readonly length = signal<SummarizerLength>('long');
  readonly source = computed(() =>
    (getMovie(this.movieId()) ?? movies[0]).notes.join('\n\n'),
  );

  readonly demoText = signal('');
  readonly onceText = signal('');
  readonly onceTiming = signal<Timing | undefined>(undefined);
  readonly streamText = signal('');
  readonly streamTiming = signal<Timing | undefined>(undefined);
  readonly running = signal(false);
  private controller?: AbortController;

  setMovie(event: Event) {
    this.movieId.set((event.target as HTMLSelectElement).value);
  }
  setLength(event: Event) {
    this.length.set(
      (event.target as HTMLSelectElement).value as SummarizerLength,
    );
  }

  private begin(): AbortSignal {
    this.controller?.abort();
    this.controller = new AbortController();
    this.running.set(true);
    return this.controller.signal;
  }

  async readDemo() {
    const signal = this.begin();
    this.demoText.set('');
    await this.log.run('readText() on a demo stream', () =>
      readText(demoStream(), (text) => this.demoText.set(text), signal),
    );
    this.running.set(false);
  }

  async runOnce(signal = this.begin()) {
    this.onceText.set('');
    this.onceTiming.set(undefined);
    const started = performance.now();
    const text = await this.log.run('summarizeOnce() (given)', () =>
      summarizeOnce(this.source(), streamOptions(this.length()), signal),
    );
    if (text !== undefined) {
      // One-shot: the first text IS the whole text, so both times are the same.
      const totalMs = performance.now() - started;
      this.onceText.set(text);
      this.onceTiming.set({ firstTextMs: totalMs, totalMs });
    }
    this.running.set(false);
  }

  async runStreaming(signal = this.begin()) {
    this.streamText.set('');
    this.streamTiming.set(undefined);
    const timing = await this.log.run('timedStreaming()', () =>
      timedStreaming(
        this.source(),
        streamOptions(this.length()),
        (text) => this.streamText.set(text),
        signal,
      ),
    );
    if (timing) this.streamTiming.set(timing);
    this.running.set(false);
  }

  /** Run both one after the other (never at the same time: they share one device). */
  async compare() {
    const signal = this.begin();
    await this.runOnce(signal);
    if (signal.aborted) return;
    this.running.set(true);
    await this.runStreaming(signal);
  }

  stop() {
    this.controller?.abort();
    this.running.set(false);
  }

  ms(value: number): string {
    return `${Math.round(value)} ms`;
  }

  ngOnDestroy() {
    // Aborting stops a running stream; Steps 1–2 cancel the reader and destroy the summarizer.
    this.controller?.abort();
  }
}
