import { Component, OnDestroy, computed, signal } from '@angular/core';
import { type Cue, getMovie, movies } from '@nano-cinema/catalogue';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  type DetectedLanguage,
  type TranslationSupport,
  canTranslate,
  detectLanguage,
  targetLanguages,
  translateCues,
} from './exercise';

interface PairState {
  code: string;
  label: string;
  state: TranslationSupport;
}

/** Ready-made UI for exercise 3.4. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-translation',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabTranslation implements OnDestroy {
  readonly log = new LabLog();
  readonly movies = movies;
  readonly targetLanguages = targetLanguages;
  readonly examples = [
    'Szukam zabawnego filmu na wieczór.',
    'Ich suche einen spannenden Film für heute Abend.',
    'Busco una película tranquila para ver con mis hijos.',
    'Something atmospheric for tonight, please.',
  ];

  readonly request = signal(this.examples[0]);
  readonly detected = signal<DetectedLanguage | undefined>(undefined);
  readonly pairs = signal<PairState[]>([]);
  readonly movieId = signal('dream');
  readonly target = signal('pl');
  readonly translated = signal<Cue[]>([]);
  readonly progress = signal('');
  readonly running = signal(false);
  readonly original = computed(
    () => (getMovie(this.movieId()) ?? movies[0]).captions,
  );
  private controller?: AbortController;

  setRequest(event: Event) {
    this.request.set((event.target as HTMLTextAreaElement).value);
  }
  setMovie(event: Event) {
    this.movieId.set((event.target as HTMLSelectElement).value);
    this.translated.set([]);
    this.progress.set('');
  }
  setTarget(event: Event) {
    this.target.set((event.target as HTMLSelectElement).value);
    this.translated.set([]);
    this.progress.set('');
  }

  private begin(): AbortSignal {
    this.controller?.abort();
    this.controller = new AbortController();
    this.running.set(true);
    return this.controller.signal;
  }

  async detect() {
    const signal = this.begin();
    this.detected.set(undefined);
    const result = await this.log.run('detectLanguage()', () =>
      detectLanguage(this.request(), signal),
    );
    if (result) this.detected.set(result);
    this.running.set(false);
  }

  async checkPairs() {
    const states: PairState[] = [];
    await this.log.run('canTranslate() for every pair', async () => {
      for (const { code, label } of targetLanguages)
        states.push({ code, label, state: await canTranslate('en', code) });
    });
    this.pairs.set(states);
  }

  async translate() {
    const signal = this.begin();
    this.translated.set([]);
    this.progress.set('');
    const cues = await this.log.run(
      `translateCues() en → ${this.target()}`,
      () =>
        translateCues(
          this.original(),
          'en',
          this.target(),
          (done, total) => this.progress.set(`${done} of ${total} cues`),
          signal,
        ),
    );
    if (cues) {
      this.translated.set(cues);
      if (!cues.length)
        this.log.info('This excerpt has no dialogue: nothing to translate.');
    }
    this.running.set(false);
  }

  stop() {
    this.controller?.abort();
    this.running.set(false);
  }

  languageName(code: string): string {
    try {
      return (
        new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code
      );
    } catch {
      return code;
    }
  }

  time(seconds: number): string {
    return `${seconds.toFixed(3)} s`;
  }

  ngOnDestroy() {
    // Aborting stops detection or translation; Steps 1 and 3 destroy their models.
    this.controller?.abort();
  }
}
